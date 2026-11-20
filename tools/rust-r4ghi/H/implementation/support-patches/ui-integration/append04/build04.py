from pathlib import Path
import hashlib,json,difflib
HERE=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
rel='apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts'
old=(ROOT/rel).read_bytes();s=old.decode('utf8')
start=s.index('export function formatSensitiveAmountProjection(')
s=s[:start]+'''/** Decimal rounding for display only; no money or rate passes through Number. */
function exactDecimalDisplay(value: string, shift: 0 | 2, minimumFractionDigits: 2, maximumFractionDigits: 2 | 4): string | null {
    const match = /^([+-]?)([0-9]+)(?:\\.([0-9]+))?$/.exec(value.trim());
    if (!match) return null;
    const whole = match[2];
    const digits = whole + (match[3] ?? '');
    const point = whole.length + shift;
    const shifted = digits.padEnd(point, '0');
    const integer = shifted.slice(0, point);
    const fraction = shifted.slice(point);
    const kept = fraction.slice(0, maximumFractionDigits).padEnd(maximumFractionDigits, '0');
    let minor = BigInt(integer + kept);
    // Intl.NumberFormat's existing halfExpand display rule, implemented exactly.
    if ((fraction[maximumFractionDigits] ?? '0') >= '5') minor += 1n;
    const rounded = minor.toString().padStart(maximumFractionDigits + 1, '0');
    const roundedInteger = rounded.slice(0, -maximumFractionDigits);
    let roundedFraction = rounded.slice(-maximumFractionDigits);
    while (roundedFraction.length > minimumFractionDigits && roundedFraction.endsWith('0')) roundedFraction = roundedFraction.slice(0, -1);
    const grouped = roundedInteger.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
    return `${match[1] === '-' ? '-' : ''}${grouped}.${roundedFraction}`;
}

export function formatSensitiveAmountProjection(projection: SensitiveStringFieldProjectionView | null | undefined, currencyCode?: string | null): string {
    if (!isSensitiveProjectionFull(projection)) {
        return sensitiveProjectionDisplayText(projection);
    }
    const value = projection?.value ?? '';
    const amount = exactDecimalDisplay(value, 0, 2, 4) ?? value;
    return `${amount} ${currencyCode ?? ''}`.trim();
}

export function formatSensitiveRatioProjection(projection: SensitiveStringFieldProjectionView | null | undefined): string {
    if (!isSensitiveProjectionFull(projection)) {
        return sensitiveProjectionDisplayText(projection);
    }
    const value = projection?.value ?? '';
    const percent = exactDecimalDisplay(value, 2, 2, 2);
    return percent === null ? value : `${percent}%`;
}
'''
target=HERE/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s,encoding='utf8',newline='\n')
(HERE/'originals'/rel).parent.mkdir(parents=True,exist_ok=True);(HERE/'originals'/rel).write_bytes(old)
(HERE/'exact-display04.patch').write_text(''.join(difflib.unified_diff(old.decode().splitlines(True),s.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel)),encoding='utf8',newline='\n')
manifest={'status':'Root-independent-single-file-proposal-not-applied','path':rel,'originalSHA256':hashlib.sha256(old).hexdigest(),'proposedSHA256':hashlib.sha256(s.encode()).hexdigest(),'amountDisplay':'existing min2 max4 halfExpand','ratioDisplay':'existing percent min2 max2 halfExpand','businessThresholdsChanged':False,'productWrites':False}
(HERE/'manifest04.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(manifest))
