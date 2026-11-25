-- Code de connexion envoyé par e-mail aux correspondants (hash uniquement).
ALTER TABLE `users`
  ADD COLUMN `email_otp_hash` VARCHAR(64) NULL,
  ADD COLUMN `email_otp_expires_at` DATETIME(3) NULL,
  ADD COLUMN `email_otp_attempts` INTEGER NOT NULL DEFAULT 0;
