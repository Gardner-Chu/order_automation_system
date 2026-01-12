CREATE TABLE `emailConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configName` varchar(100) NOT NULL,
	`imapHost` varchar(200) NOT NULL,
	`imapPort` int NOT NULL DEFAULT 993,
	`imapUser` varchar(320) NOT NULL,
	`imapPassword` text NOT NULL,
	`useSsl` int NOT NULL DEFAULT 1,
	`folderName` varchar(100) NOT NULL DEFAULT 'INBOX',
	`fieldMapping` text,
	`isActive` int NOT NULL DEFAULT 1,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailConfig_configName_unique` UNIQUE(`configName`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productCode` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`specification` varchar(500),
	`unitPrice` int,
	`totalPrice` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(100) NOT NULL,
	`customerName` varchar(200) NOT NULL,
	`customerEmail` varchar(320),
	`orderDate` timestamp NOT NULL,
	`deliveryDate` timestamp,
	`status` enum('pending','confirmed','processing','completed','exception') NOT NULL DEFAULT 'pending',
	`sourceEmailId` varchar(200),
	`aiConfidence` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `processingLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`emailId` varchar(200) NOT NULL,
	`emailSubject` varchar(500),
	`emailFrom` varchar(320),
	`attachmentName` varchar(500),
	`attachmentType` enum('excel','image','pdf','other'),
	`processingStatus` enum('pending','processing','success','failed','exception') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`aiResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processingLog_id` PRIMARY KEY(`id`)
);
