FROM python:3.9-alpine

WORKDIR /app

RUN pip install --no-cache-dir flask gunicorn

COPY ./app /app

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
