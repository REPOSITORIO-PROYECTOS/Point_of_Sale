FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

ARG AFIP_REPO=https://github.com/REPOSITORIO-PROYECTOS/servicio_afip.git
ARG AFIP_REF=main

RUN git clone --depth 1 --branch "${AFIP_REF}" "${AFIP_REPO}" /tmp/servicio_afip \
    && cp -r /tmp/servicio_afip/. . \
    && rm -rf /tmp/servicio_afip

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8002

CMD ["gunicorn", "-c", "gunicorn_conf.py", "wsgi:app"]
