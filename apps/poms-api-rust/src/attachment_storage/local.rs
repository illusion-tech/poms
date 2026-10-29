use super::{AttachmentStorage, ObjectLocation, ObjectMetadata, StorageFailure};
use axum::{
    body::{Body, Bytes},
    http::StatusCode,
};
use futures_util::stream;
use std::path::{Component, Path, PathBuf};
use tokio::io::AsyncReadExt;

fn lexical(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for part in path.components() {
        match part {
            Component::CurDir => {}
            Component::ParentDir => {
                result.pop();
            }
            other => result.push(other.as_os_str()),
        }
    }
    result
}
pub(crate) fn absolute_root(root: &str) -> PathBuf {
    let path = Path::new(root);
    if path.is_absolute() {
        lexical(path)
    } else {
        lexical(
            &std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(path),
        )
    }
}
pub(crate) fn file_error(error: std::io::Error, op: &str, path: &Path) -> StorageFailure {
    let code = match error.kind() {
        std::io::ErrorKind::NotFound => "ENOENT",
        std::io::ErrorKind::PermissionDenied => "EACCES",
        std::io::ErrorKind::NotADirectory => "ENOTDIR",
        std::io::ErrorKind::IsADirectory => "EISDIR",
        _ => "EIO",
    };
    let detail = match code {
        "ENOENT" => "no such file or directory",
        "EACCES" => "permission denied",
        "ENOTDIR" => "not a directory",
        "EISDIR" => "illegal operation on a directory",
        _ => "i/o error",
    };
    // Node ReadStream uses fs.read(fd), whose error has no path. Opening a
    // pathname retains it; do not change that distinct failure boundary.
    if op == "read" {
        StorageFailure::unexpected(format!("{code}: {detail}, {op}"))
    } else {
        StorageFailure::unexpected(format!("{code}: {detail}, {op} '{}'", path.display()))
    }
}

impl AttachmentStorage {
    pub(crate) fn resolve_local_key(&self, key: &str) -> Result<PathBuf, StorageFailure> {
        let normalized = key.replace('\\', "/");
        let normalized = normalized.trim_start_matches('/');
        let path = lexical(&self.root.join(normalized));
        if path != *self.root && !path.starts_with(self.root.as_path()) {
            return Err(StorageFailure::unexpected("Invalid attachment storage key"));
        }
        Ok(path)
    }
    pub(crate) async fn local_put(
        &self,
        key: &str,
        bytes: &[u8],
    ) -> Result<ObjectLocation, StorageFailure> {
        let path = self.resolve_local_key(key)?;
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| file_error(e, "mkdir", parent))?;
        }
        tokio::fs::write(&path, bytes)
            .await
            .map_err(|e| file_error(e, "open", &path))?;
        Ok(ObjectLocation {
            storage_provider: "local".into(),
            storage_bucket: None,
            storage_key: key.into(),
        })
    }
    pub(crate) async fn local_head(&self, key: &str) -> Result<ObjectMetadata, StorageFailure> {
        let missing = || {
            StorageFailure::http(
                StatusCode::NOT_FOUND,
                format!("Attachment file {key} not found"),
            )
        };
        let path = self.resolve_local_key(key).map_err(|_| missing())?;
        let stat = tokio::fs::metadata(&path).await.map_err(|_| missing())?;
        let modified = stat.modified().map_err(|_| missing())?;
        Ok(ObjectMetadata {
            size_bytes: stat.len() as f64,
            e_tag: None,
            last_modified: Some(super::service::iso(modified.into())),
            content_type: None,
            checksum_sha256: None,
        })
    }
    pub(crate) async fn local_read(&self, key: &str) -> Result<Body, StorageFailure> {
        let path = self.resolve_local_key(key)?;
        tokio::fs::metadata(&path).await.map_err(|_| {
            StorageFailure::http(
                StatusCode::NOT_FOUND,
                format!("Attachment file {key} not found"),
            )
        })?;
        // createReadStream's open/read errors happen during pipe, after J audit.
        let state = (Some(path), None::<tokio::fs::File>);
        Ok(Body::from_stream(stream::try_unfold(
            state,
            |(path, file)| async move {
                let (path, mut file) = match (path, file) {
                    (Some(path), None) => {
                        let file = tokio::fs::File::open(&path)
                            .await
                            .map_err(|e| file_error(e, "open", &path))?;
                        (path, file)
                    }
                    (Some(path), Some(file)) => (path, file),
                    _ => return Ok::<_, StorageFailure>(None),
                };
                let mut bytes = vec![0u8; 65_536];
                let size = file
                    .read(&mut bytes)
                    .await
                    .map_err(|e| file_error(e, "read", &path))?;
                if size == 0 {
                    return Ok(None);
                }
                bytes.truncate(size);
                Ok(Some((Bytes::from(bytes), (Some(path), Some(file)))))
            },
        )))
    }
    pub(crate) async fn local_delete(&self, key: &str) -> Result<(), StorageFailure> {
        let path = self.resolve_local_key(key)?;
        tokio::fs::remove_file(&path)
            .await
            .map_err(|e| file_error(e, "unlink", &path))
    }
    pub(crate) async fn local_test(&self) -> Result<String, StorageFailure> {
        let key = format!(".poms-storage-test-{}", super::service::random_uuid()?);
        self.local_put(&key, b"ok").await?;
        self.local_delete(&key).await?;
        Ok(format!(
            "Local attachment storage root is writable: {}",
            self.root.display()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn directory_fd_read_error_matches_native_without_laundering_open_path() {
        let read = file_error(
            std::io::Error::from(std::io::ErrorKind::IsADirectory),
            "read",
            Path::new("/synthetic/object"),
        );
        assert_eq!(
            read.message.to_utf8_lossy(),
            "EISDIR: illegal operation on a directory, read"
        );
        let open = file_error(
            std::io::Error::from(std::io::ErrorKind::NotFound),
            "open",
            Path::new("/synthetic/object"),
        );
        assert_eq!(
            open.message.to_utf8_lossy(),
            "ENOENT: no such file or directory, open '/synthetic/object'"
        );
    }
}
