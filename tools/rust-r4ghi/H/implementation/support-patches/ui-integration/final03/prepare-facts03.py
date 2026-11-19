from pathlib import Path
p=Path(__file__).resolve().parent
s=(p.parent/'append02/check-facts02.cjs').read_text(encoding='utf8')
s=s.replace("const shared130=path.resolve(__dirname,'../../shared-g2-130/proposed');\nfunction physical(file){const rel=path.relative(root,file),candidate=path.join(shared130,rel);return !rel.startsWith('..')&&fs.existsSync(candidate)?candidate:file;}", "function physical(file){return file;}")
s=s.replace("closeProjectCompletionConditionRequest: body ","closeProjectCompletionConditionRequest: ClientValue\\.closeCondition\\(body\\) ")
s=s.replace("'facts-unit02.json'","'facts-unit03.json'")
s=s.replace('canonical130OverlayOnly:true','actualRootCanonical130:true')
(p/'check-facts03.cjs').write_text(s,encoding='utf8',newline='\n')
