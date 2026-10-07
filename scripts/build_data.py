"""Merge source research and normalize display tags without inventing facts."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECTOR_RULES = [
    (r'health|life science|pharma|medical|biotech', 'Healthcare'),
    (r'technolog|software|cyber|data|semiconductor|internet|digital|fintech|information service', 'Technology'),
    (r'consumer|retail|restaurant|food|beverage|beauty|apparel|pet |franchis', 'Consumer & retail'),
    (r'industrial|manufactur|chemical|material|aerospace|defense|packag|automotive', 'Industrials'),
    (r'financial|insurance|fintech|asset management', 'Financial services'),
    (r'business service|professional service|outsourc|commercial service|tech.enabled service|^services$', 'Business services'),
    (r'energy|power|renewable|utility|utilities|sustainab', 'Energy & sustainability'),
    (r'infrastructure|real estate|real asset', 'Real assets'),
    (r'media|telecom|communication|entertainment', 'Media & communications'),
    (r'transport|logistic|distribut|supply chain', 'Transport & logistics'),
    (r'education|training', 'Education'),
    (r'credit|debt|distressed|special situation|restructur|direct lending', 'Credit & special situations'),
    (r'investor relation|fundrais|capital formation|client service', 'Investor relations'),
    (r'operating|portfolio operation|value creation|talent|human capital|firm operation', 'Portfolio operations'),
    (r'generalist|multi.sector|cross.sector|broad.based|firm leadership|private equity|buyout|growth equity', 'Multi-sector'),
]

def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def normalize_sectors(items):
    found = []
    for item in items:
        if item in ['Latin America', 'North America', 'Europe', 'Asia']: continue
        labels = [label for pattern,label in SECTOR_RULES if re.search(pattern, item, re.I)]
        for label in labels or [item]:
            if label not in found:
                found.append(label)
    if len(found)>1 and 'Multi-sector' in found:
        found.remove('Multi-sector')
    return found

def build():
    firms=[]
    for path in sorted((ROOT/'research').glob('group-*.json')):
        group=json.loads(path.read_text())
        firms.extend(group['firms'])
    for firm in firms:
        firm['id']=slug(firm.get('id') or firm['name'])
        firm['sectorDetail']=firm.get('sectors', [])
        firm['sectors']=normalize_sectors(firm['sectorDetail'])
        for person in firm.get('people', []):
            person['id']=firm['id']+'--'+slug(person['name'])
            person['sectorDetail']=person.get('sectors', [])
            person['sectors']=normalize_sectors(person['sectorDetail'])
            person.setdefault('interests', [])
            person.setdefault('gradYear', None)
            person.setdefault('email', None)
            person.setdefault('photoUrl', None)
            person.setdefault('degree', 'MBA')
    firms.sort(key=lambda f: (-(f.get('aumBillions') or -1), f['name']))
    result={
        'schemaVersion': 1,
        'reviewedAt': '2026-10-07',
        'title': 'GSB Atlas',
        'scope': 'Editorial selection of major US middle-market and UMM-active private equity firms; not a definitive national ranking or exhaustive alumni roster.',
        'rankingBasis': 'Latest accessible disclosed USD AUM, including named adviser regulatory AUM where identified; dates and scopes vary. Never cumulative capital raised.',
        'degreePriority': 'Stanford Graduate School of Business MBA',
        'firms':firms,
    }
    (ROOT/'data').mkdir(exist_ok=True)
    (ROOT/'data'/'atlas.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    print(f"Built {len(firms)} firms, {sum(len(f.get('people',[])) for f in firms)} alumni profiles")

if __name__=='__main__':
    build()
