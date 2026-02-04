# HRMS API Authentication Notes

## Default Admin Seeding
- On startup the server checks for an HR manager account.
- If one does not exist it creates an employee and user using these environment variables:
  - `SEED_COMPANY_NAME`, `SEED_COMPANY_ADDRESS`, `SEED_COMPANY_PHONE`
  - `SEED_HR_MANAGER_USERNAME`, `SEED_HR_MANAGER_EMAIL`, `SEED_HR_MANAGER_FIRST_NAME`, `SEED_HR_MANAGER_LAST_NAME`
  - `SEED_HR_MANAGER_PASSWORD` (default `ChangeMe123!` if omitted)
- Review the console output the first time the server runs to capture the seeded credentials.

## Email Delivery
- System user invitations attempt to send email via SMTP.
- Configure the following variables for production delivery:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- When SMTP is not configured the service logs the credential details instead of sending mail.

## JWT & Password Settings
- Set `JWT_SECRET` and optional `JWT_EXPIRES_IN` (default `1d`).
- Adjust `BCRYPT_SALT_ROUNDS` if stronger hashing is required (default `10`).

## Core Endpoints
- `POST /api/auth/login`
- `POST /api/auth/users` (HR_MANAGER only)
- `PATCH /api/auth/change-password`
