# Subir stayCalm a su propio repo

Si Cursor aún no puede hacer push a https://github.com/elbirli69-esp/stayCalm :

```bash
git clone https://github.com/elbirli69-esp/stayCalm.git
cd stayCalm
curl -L -o stayCalm.bundle \
  https://raw.githubusercontent.com/elbirli69-esp/mrWhite/cursor/staycalm-export-c8f5/stayCalm-export/stayCalm-initial.bundle
git pull stayCalm.bundle main
git push -u origin main
```

Luego puedes borrar esta rama de export en mrWhite.
