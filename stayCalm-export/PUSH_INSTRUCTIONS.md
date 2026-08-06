# Subir stayCalm a su propio repo

## Opción rápida (bundle)

```bash
git clone https://github.com/elbirli69-esp/stayCalm.git
cd stayCalm
curl -L -o stayCalm.bundle \
  https://raw.githubusercontent.com/elbirli69-esp/mrWhite/cursor/staycalm-export-c8f5/stayCalm-export/stayCalm-initial.bundle
git pull stayCalm.bundle main
git push -u origin main
```

## Opción carpeta

Copia el contenido de `stayCalm-export/` (excepto este markdown y el `.bundle`) a un clone vacío de stayCalm, commit y push.
