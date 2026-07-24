import requests
import json

base_url = 'http://127.0.0.1:5000/api/admin'

endpoints = [
    '/configuracion',
    '/proyectos',
    '/alumnos',
    '/matriz-validacion',
    '/stats'
]

for ep in endpoints:
    url = base_url + ep
    try:
        r = requests.get(url)
        print(f"[{r.status_code}] GET {ep}")
    except Exception as e:
        print(f"[ERROR] GET {ep}: {str(e)}")
