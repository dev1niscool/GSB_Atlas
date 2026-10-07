"""Validate source coverage and the public directory's data contract."""
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data'/'atlas.json').read_text())
errors=[]

def check(condition,message):
    if not condition: errors.append(message)

def is_url(url):
    return isinstance(url,str) and urlparse(url).scheme in ('https','http') and bool(urlparse(url).netloc)

def source_url(source):
    return source if isinstance(source,str) else source.get('url') if isinstance(source,dict) else None

check(len(data['firms'])>=25,'Must contain at least 25 researched firms')
firm_ids=set(); person_ids=set(); people_count=0; emails=0; photos=0
for f in data['firms']:
    check(f['id'] not in firm_ids,f"Duplicate firm ID {f['id']}");firm_ids.add(f['id'])
    check(is_url(f.get('website')),f"{f['name']}: invalid firm website")
    a=f.get('aumBillions')
    check(a is None or isinstance(a,(int,float)) and math.isfinite(a) and a>0,f"{f['name']}: invalid AUM")
    check(bool(f.get('aumBasis')),f"{f['name']}: missing AUM definition")
    check(bool(f.get('aumAsOf')),f"{f['name']}: missing AUM/source date")
    check(is_url(source_url(f.get('aumSource'))),f"{f['name']}: missing AUM source")
    for p in f.get('people',[]):
        people_count+=1
        check(p['id'] not in person_ids,f"Duplicate person ID {p['id']}");person_ids.add(p['id'])
        for field in ['name','title','education','degree','background']:
            check(bool(p.get(field)),f"{p['name']}: missing {field}")
        check('stanford' in p.get('education','').lower(),f"{p['name']}: no Stanford education evidence label")
        check(bool(p.get('sources')),f"{p['name']}: missing biography/education source")
        for source in p.get('sources',[]):
            check(is_url(source_url(source)),f"{p['name']}: invalid source")
        if p.get('email'):
            emails+=1
            check(bool(re.fullmatch(r'[^\s@*]+@[^\s@*]+\.[^\s@*]+',p['email'])),f"{p['name']}: invalid or masked professional email")
            check(is_url(source_url(p.get('emailSource'))),f"{p['name']}: email missing source")
            check(p.get('emailEvidenceType') in ('company','filing','third-party'),f"{p['name']}: email missing source classification")
            check(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',p.get('emailReviewedAt',''))),f"{p['name']}: email missing review date")
            check(bool(p.get('emailNote')),f"{p['name']}: email missing source context")
            check(p['email'].lower() in p.get('emailEvidence','').lower(),f"{p['name']}: exact email missing from evidence excerpt")
            check(p['email'].split('@')[-1].lower() not in ('gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com'),f"{p['name']}: personal-provider email is outside directory scope")
        if p.get('photoUrl'):
            photos+=1
            check(is_url(p['photoUrl']) or p['photoUrl'].startswith('assets/'),f"{p['name']}: invalid photo URL")
            check(is_url(source_url(p.get('photoSource'))),f"{p['name']}: portrait missing source")
        check(isinstance(p.get('interests'),list),f"{p['name']}: interests must be a list")
        check(isinstance(p.get('sectors'),list),f"{p['name']}: sectors must be a list")
if errors:
    raise SystemExit('\n'.join(errors))
print(f"Validated {len(firm_ids)} firms; {people_count} alumni; {emails} sourced professional emails; {photos} attributed portraits.")
