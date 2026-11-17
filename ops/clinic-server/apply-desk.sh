#!/bin/bash
# Run once in Google Cloud Shell: adds desk.bas30din.com to the clinic server and restarts it (about 1-2 min).
set -e
gcloud config set project bas30din-clinic-bot
curl -fsSL "https://raw.githubusercontent.com/secretknook/bas30din-site/91fb5df8c1f8386e36674666f3bd8f2da401c313/ops/clinic-server/vm-startup.sh" -o /tmp/vm-startup.sh
grep -q desk.bas30din.com /tmp/vm-startup.sh
gcloud compute instances add-metadata clinic-bot --zone=us-central1-a --metadata-from-file=startup-script=/tmp/vm-startup.sh
gcloud compute instances reset clinic-bot --zone=us-central1-a
echo DESK_DONE
