# Blakely Cinematics — Mail System Audit (Summary)

## Backend Routes (API Gateway v1 /mail*)
See audits/mail-route-lambda-map.tsv for mapping.

## Lambdas (Deployed Bundles)
See audits/mail-manage-deployed.zip, mail-send-deployed.zip, mail-fetch-deployed.zip, mail-imap-sync-deployed.zip (if present). Each shows deployed files and confirms handler names.

## DynamoDB (blakely-cinematics-emails)
Primary key: userId (HASH), emailId (RANGE)
GSI: folder-timestamp-index (folder, timestamp)

## IAM and Secrets
See audits/iam-mail-role.json, audits/iam-policies.json, audits/secrets-list.json.

## Attachments/S3
See audits/s3-buckets.txt and audits/attachments-search.txt.

## Frontend Actions
See audits/frontend-actions.txt for where UI functions appear.

## Coverage Matrix
See audits/mail-coverage.csv for UI → API → Lambda → DB status.

## Gaps / Next Actions
1) Add unified router mapping for POST /mail/sync → mail-imap-sync.
2) Implement in mail-manage: mark-unread, toggle-star, archive, snooze.
3) If snooze is added, consider attribute "snoozeUntil" and optional GSI if you’ll query by wake time.
4) Confirm SES/IMAP credentials exist in Secrets Manager and are referenced by Lambdas.
5) Add minimal integration tests for /mail/manage actions and DELETE /mail/{id}.
