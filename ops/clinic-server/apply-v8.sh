#!/bin/bash
# Run once in Google Cloud Shell: the clinic server handles one request at a time (no lost changes
# when two staff tap together) and sends pages compressed (faster on phones). Restarts in about 1-2 min.
set -e
gcloud config set project bas30din-clinic-bot
curl -fsSL "https://raw.githubusercontent.com/secretknook/bas30din-site/2a6ef9ca2138bc8b3bcbd1956fe0922d7a90fa8a/ops/clinic-server/vm-startup.sh" -o /tmp/vm-startup.sh
grep -q N8N_CONCURRENCY_PRODUCTION_LIMIT /tmp/vm-startup.sh
gcloud compute instances add-metadata clinic-bot --zone=us-central1-a --metadata-from-file=startup-script=/tmp/vm-startup.sh
gcloud compute instances reset clinic-bot --zone=us-central1-a
echo V8_SERVER_DONE
