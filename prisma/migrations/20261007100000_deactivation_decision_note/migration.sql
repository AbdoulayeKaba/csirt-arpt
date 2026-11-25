-- AlterTable
ALTER TABLE `organization_deactivation_requests`
  MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `decision_note` TEXT NULL;
