#!/bin/bash
# Run once in Google Cloud Shell. Creates the free n8n server.
set -e
P=bas30din-clinic-bot
gcloud projects describe $P >/dev/null 2>&1 || gcloud projects create $P --name="Clinic Bot"
gcloud billing projects link $P --billing-account=0131FA-45DA79-02B267
gcloud config set project $P
gcloud services enable compute.googleapis.com
gcloud compute firewall-rules describe allow-web >/dev/null 2>&1 || gcloud compute firewall-rules create allow-web --allow=tcp:80,tcp:443 --target-tags=web
curl -fsSL "$1" -o /tmp/vm-startup.sh
gcloud compute instances describe clinic-bot --zone=us-central1-a >/dev/null 2>&1 || gcloud compute instances create clinic-bot \
  --zone=us-central1-a --machine-type=e2-micro \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB --boot-disk-type=pd-standard \
  --network-tier=STANDARD --tags=web \
  --metadata-from-file=startup-script=/tmp/vm-startup.sh
echo "SERVER_IP: $(gcloud compute instances describe clinic-bot --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
echo SETUP_FINISHED
