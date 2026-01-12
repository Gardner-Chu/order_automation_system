ALTER TABLE `orders` MODIFY COLUMN `sourceEmailId` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `attachmentUrls` text;