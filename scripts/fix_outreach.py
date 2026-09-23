import os

path = '/home/opc/sale-baile/scripts/agente_outreach.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'def load_new_leads():'
addition = '''GROUP_MEMBERS_URL = f"{FIREBASE_BASE}/monitored_accounts.json"

def is_already_in_group(handle):
    """Verifica si el organizador ya forma parte del grupo."""
    try:
        resp = urllib.request.urlopen(GROUP_MEMBERS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            for key, member in data.items():
                if isinstance(member, dict) and member.get('handle', '').replace('@','') == handle.replace('@',''):
                    return True
        return False
    except:
        return False

'''

if 'def is_already_in_group' not in content:
    content = content.replace(target, addition + target)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("ALREADY EXISTS")
