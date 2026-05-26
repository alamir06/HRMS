CREATE TABLE `employee_surety` (
  `id` binary(16) NOT NULL,
  `employeeId` binary(16) NOT NULL,
  `suretyName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suretyPhone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suretyEmail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentPath` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mimeType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fileSize` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_employee_surety` (`employeeId`),
  CONSTRAINT `fk_employee_surety` FOREIGN KEY (`employeeId`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
