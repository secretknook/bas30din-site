#!/bin/bash
# Run once in Google Cloud Shell: adds api.okaybridge.com + clinic.okaybridge.com to the clinic server
# (old bas30din addresses keep working) and restarts it (about 1-2 min).
set -e
SHA="${1:?commit sha}"
gcloud config set project bas30din-clinic-bot
curl -fsSL "https://raw.githubusercontent.com/secretknook/bas30din-site/$SHA/ops/clinic-server/vm-startup.sh" -o /tmp/vm-startup.sh
grep -q api.okaybridge.com /tmp/vm-startup.sh
grep -q bot.bas30din.com /tmp/vm-startup.sh
gcloud compute instances add-metadata clinic-bot --zone=us-central1-a --metadata-from-file=startup-script=/tmp/vm-startup.sh
gcloud compute instances reset clinic-bot --zone=us-central1-a
echo OKAYBRIDGE_DONE
