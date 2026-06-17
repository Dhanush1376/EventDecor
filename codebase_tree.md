EventDecor/
├── .cursor
│   └── settings.json
├── .github
│   ├── dependabot.yml
│   └── workflows
│       └── ci.yml
├── .gitignore
├── .lintstagedrc.json
├── .npmrc
├── .prettierrc.json
├── backend
│   ├── .dockerignore
│   ├── .env.example
│   ├── .gitignore
│   ├── .npmrc
│   ├── AI_SECURITY.md
│   ├── DISASTER_RECOVERY.md
│   ├── Dockerfile
│   ├── ecosystem.config.js
│   ├── eslint.config.mjs
│   ├── jest.config.cjs
│   ├── migrations
│   │   └── README.md
│   ├── ops
│   │   ├── audits
│   │   │   ├── check_categories.js
│   │   │   ├── check_products.js
│   │   │   ├── check-admins.js
│   │   │   ├── check-reviews.js
│   │   │   ├── cloudinaryExport.js
│   │   │   ├── exportCurrentDb.js
│   │   │   ├── list-users.js
│   │   │   ├── post_migration_audit.ts
│   │   │   ├── queryAuditLogs.js
│   │   │   └── run-explains.ts
│   │   ├── maintenance
│   │   │   ├── activate_products.js
│   │   │   ├── check_lock.js
│   │   │   ├── clear-wishlist-duplicates.js
│   │   │   ├── drop_indexes.js
│   │   │   ├── fixRazorpayPaths.js
│   │   │   ├── invalidate_cache.js
│   │   │   ├── prod-maintenance.sh
│   │   │   ├── refactorRazorpay.js
│   │   │   └── rotate-secrets.sh
│   │   ├── migrations
│   │   │   ├── add_missing_categories.js
│   │   │   ├── add-missing-indexes.ts
│   │   │   ├── migrate_legacy_media.ts
│   │   │   └── migrate-reviews.js
│   │   ├── recovery
│   │   │   ├── extractProductsFromAudit.js
│   │   │   ├── importRecoveredProducts.js
│   │   │   ├── reconstructProducts.js
│   │   │   ├── restore_categories.js
│   │   │   ├── restoreAdmin.js
│   │   │   └── verifyBackup.js
│   │   └── testing
│   │       ├── create-test-user.js
│   │       ├── run-matrix.js
│   │       ├── run-test.js
│   │       ├── test_admin_auth.js
│   │       ├── test_groq.js
│   │       └── testImageUrls.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── PERFORMANCE_OPTIMIZATION.md
│   ├── railway.json
│   ├── README.md
│   ├── render.yaml
│   ├── SCALING.md
│   ├── server.ts
│   ├── src
│   │   ├── __tests__
│   │   │   ├── admin-refund-approval.test.ts
│   │   │   ├── adminInvite.test.ts
│   │   │   ├── api.integration.test.ts
│   │   │   ├── auth.integration.test.ts
│   │   │   ├── chaos
│   │   │   │   └── resilience.test.ts
│   │   │   ├── csrf.test.ts
│   │   │   ├── fieldEncryption.test.ts
│   │   │   ├── inventory-reservation.test.ts
│   │   │   ├── inventory.integration.test.ts
│   │   │   ├── load
│   │   │   │   └── k6-load-test.js
│   │   │   ├── media.integration.test.ts
│   │   │   ├── modelTtlIndexes.test.ts
│   │   │   ├── my-orders-filter.test.ts
│   │   │   ├── order-checkout.test.ts
│   │   │   ├── otp-auth.test.ts
│   │   │   ├── payment-refund.test.ts
│   │   │   ├── payment-state-machine.test.ts
│   │   │   ├── payment-webhook-idempotency.test.ts
│   │   │   ├── payment.integration.test.ts
│   │   │   ├── rateLimit.integration.test.ts
│   │   │   ├── recommendation.integration.test.ts
│   │   │   ├── rental-block.test.ts
│   │   │   ├── search-cache.test.ts
│   │   │   ├── search.test.ts
│   │   │   ├── security.test.ts
│   │   │   ├── session-auth.test.ts
│   │   │   ├── setupEnv.ts
│   │   │   ├── socket.integration.test.ts
│   │   │   ├── tsconfig.json
│   │   │   ├── upload-security.test.ts
│   │   │   ├── upload.integration.test.ts
│   │   │   └── webhook.integration.test.ts
│   │   ├── app.ts
│   │   ├── config
│   │   │   ├── adminConfig.ts
│   │   │   ├── cloudinary.ts
│   │   │   ├── cookieConfig.ts
│   │   │   ├── corsConfig.ts
│   │   │   ├── db.ts
│   │   │   ├── dbAuditor.ts
│   │   │   ├── ensureIndexes.ts
│   │   │   ├── env.ts
│   │   │   ├── envSchema.ts
│   │   │   ├── envValidation.ts
│   │   │   ├── loadEnv.ts
│   │   │   ├── logger.ts
│   │   │   ├── razorpay.ts
│   │   │   ├── secretAudit.ts
│   │   │   ├── socketState.ts
│   │   │   └── startupValidator.ts
│   │   ├── constants
│   │   │   ├── loyaltyTiers.ts
│   │   │   └── placeholderImages.ts
│   │   ├── controllers
│   │   │   ├── adminAuthController.ts
│   │   │   ├── adminInviteController.ts
│   │   │   ├── adminManagementController.ts
│   │   │   ├── adminNotificationController.ts
│   │   │   ├── aiVisionController.ts
│   │   │   ├── analyticsController.ts
│   │   │   ├── appConfigController.ts
│   │   │   ├── authController.ts
│   │   │   ├── categoryController.ts
│   │   │   ├── cmsController.ts
│   │   │   ├── contentController.ts
│   │   │   ├── couponController.ts
│   │   │   ├── customOrderController.ts
│   │   │   ├── eventBookingController.ts
│   │   │   ├── eventController.ts
│   │   │   ├── galleryController.ts
│   │   │   ├── healthController.ts
│   │   │   ├── inquiryController.ts
│   │   │   ├── loyaltyController.ts
│   │   │   ├── mediaController.ts
│   │   │   ├── notificationController.ts
│   │   │   ├── orderController.ts
│   │   │   ├── pageLayoutController.ts
│   │   │   ├── paymentReconciliationController.ts
│   │   │   ├── personalizedSectionsController.ts
│   │   │   ├── policyController.ts
│   │   │   ├── privacyController.ts
│   │   │   ├── productController.ts
│   │   │   ├── recommendationAnalyticsController.ts
│   │   │   ├── recommendationController.ts
│   │   │   ├── refundController.ts
│   │   │   ├── rentalController.ts
│   │   │   ├── rentalPolicyController.ts
│   │   │   ├── reviewController.ts
│   │   │   ├── searchController.ts
│   │   │   ├── serviceAreaController.ts
│   │   │   ├── showcaseController.ts
│   │   │   ├── socialController.ts
│   │   │   ├── trackingController.ts
│   │   │   ├── twoFactorController.ts
│   │   │   ├── uploadController.ts
│   │   │   ├── userController.ts
│   │   │   └── visualSearchController.ts
│   │   ├── jobs
│   │   │   ├── backupJob.ts
│   │   │   ├── cronJobs.ts
│   │   │   ├── dailyBackupJob.ts
│   │   │   ├── DataMonitorJob.ts
│   │   │   ├── healthMonitorJob.ts
│   │   │   ├── orphanAssetCleanup.ts
│   │   │   ├── outboxProcessor.ts
│   │   │   ├── PaymentReconciliationJob.ts
│   │   │   ├── queues.ts
│   │   │   ├── rentalCronJobs.ts
│   │   │   ├── staleOrderCleanup.ts
│   │   │   └── workers.ts
│   │   ├── middleware
│   │   │   ├── apiVersion.ts
│   │   │   ├── authMiddleware.ts
│   │   │   ├── cacheHeaders.ts
│   │   │   ├── cacheMiddleware.ts
│   │   │   ├── corsMiddleware.ts
│   │   │   ├── csrfMiddleware.ts
│   │   │   ├── dbReadinessGuard.ts
│   │   │   ├── dynamicCacheMiddleware.ts
│   │   │   ├── enforceHttps.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   ├── helmetMiddleware.ts
│   │   │   ├── noCacheMiddleware.ts
│   │   │   ├── queryGuard.ts
│   │   │   ├── queryTimeout.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── requestLogger.ts
│   │   │   ├── requestTracker.ts
│   │   │   ├── upload.ts
│   │   │   ├── validate.ts
│   │   │   ├── validateMiddleware.ts
│   │   │   └── zodValidationMiddleware.ts
│   │   ├── migrateCms.ts
│   │   ├── models
│   │   │   ├── Address.ts
│   │   │   ├── AdminAuditLog.ts
│   │   │   ├── AdminInvite.ts
│   │   │   ├── AdminNotification.ts
│   │   │   ├── AppConfig.ts
│   │   │   ├── BookingMessage.ts
│   │   │   ├── Category.ts
│   │   │   ├── ConsentPreference.ts
│   │   │   ├── ContentSection.ts
│   │   │   ├── Counter.ts
│   │   │   ├── Coupon.ts
│   │   │   ├── CustomOrder.ts
│   │   │   ├── CustomOrderConfig.ts
│   │   │   ├── EmailCampaign.ts
│   │   │   ├── EmailTemplate.ts
│   │   │   ├── Event.ts
│   │   │   ├── EventBooking.ts
│   │   │   ├── FailedEmailJob.ts
│   │   │   ├── FailedLoginAttempt.ts
│   │   │   ├── Gallery.ts
│   │   │   ├── Inquiry.ts
│   │   │   ├── InventoryLedger.ts
│   │   │   ├── InventoryLog.ts
│   │   │   ├── InventoryReservation.ts
│   │   │   ├── NotificationLog.ts
│   │   │   ├── Order.ts
│   │   │   ├── OtpRequestLog.ts
│   │   │   ├── OtpVerification.ts
│   │   │   ├── OutboxEvent.ts
│   │   │   ├── PageLayout.ts
│   │   │   ├── PasswordResetToken.ts
│   │   │   ├── PaymentAudit.ts
│   │   │   ├── PaymentWebhookEvent.ts
│   │   │   ├── Policy.ts
│   │   │   ├── Product.ts
│   │   │   ├── RecycleBin.ts
│   │   │   ├── RefreshToken.ts
│   │   │   ├── RefundRecord.ts
│   │   │   ├── RentalCalendar.ts
│   │   │   ├── RentalDayBlock.ts
│   │   │   ├── RentalInspection.ts
│   │   │   ├── RentalOrder.ts
│   │   │   ├── RentalPolicy.ts
│   │   │   ├── Review.ts
│   │   │   ├── ServiceArea.ts
│   │   │   ├── ShowcaseCollection.ts
│   │   │   ├── TeamInvite.ts
│   │   │   ├── TrendingSnapshot.ts
│   │   │   ├── UsedRefreshToken.ts
│   │   │   ├── User.ts
│   │   │   ├── UserInteraction.ts
│   │   │   ├── UserPreferenceProfile.ts
│   │   │   ├── VersionHistory.ts
│   │   │   ├── VisualSearchConfig.ts
│   │   │   ├── VisualSearchLog.ts
│   │   │   ├── WalletTransaction.ts
│   │   │   └── WebsiteContent.ts
│   │   ├── routes
│   │   │   ├── adminInviteRoutes.ts
│   │   │   ├── adminSystemRoutes.ts
│   │   │   ├── analyticsRoutes.ts
│   │   │   ├── appConfigRoutes.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── categoryRoutes.ts
│   │   │   ├── cmsRoutes.ts
│   │   │   ├── couponRoutes.ts
│   │   │   ├── customOrderRoutes.ts
│   │   │   ├── eventBookingRoutes.ts
│   │   │   ├── eventRoutes.ts
│   │   │   ├── galleryRoutes.ts
│   │   │   ├── healthRoutes.ts
│   │   │   ├── inquiryRoutes.ts
│   │   │   ├── loyaltyRoutes.ts
│   │   │   ├── mediaRoutes.ts
│   │   │   ├── metricsRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   ├── orderRoutes.ts
│   │   │   ├── pageLayoutRoutes.ts
│   │   │   ├── policyRoutes.ts
│   │   │   ├── productRoutes.ts
│   │   │   ├── recommendationAnalyticsRoutes.ts
│   │   │   ├── recommendationRoutes.ts
│   │   │   ├── refundRoutes.ts
│   │   │   ├── registerApiRoutes.ts
│   │   │   ├── rentalPolicyRoutes.ts
│   │   │   ├── rentalRoutes.ts
│   │   │   ├── reviewRoutes.ts
│   │   │   ├── searchRoutes.ts
│   │   │   ├── serviceAreaRoutes.ts
│   │   │   ├── showcaseRoutes.ts
│   │   │   ├── socialRoutes.ts
│   │   │   ├── trackingRoutes.ts
│   │   │   ├── uploadRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── visualSearchRoutes.ts
│   │   ├── scripts
│   │   │   ├── backupDb.ts
│   │   │   ├── backupMedia.ts
│   │   │   ├── checkEnv.ci.ts
│   │   │   ├── checkUsers.ts
│   │   │   ├── cloudflareAudit.ts
│   │   │   ├── createAdmin.ts
│   │   │   ├── createIndexes.ts
│   │   │   ├── cronBackup.ts
│   │   │   ├── findFloralProducts.ts
│   │   │   ├── fix-and-tag.ts
│   │   │   ├── fix-object-ids.ts
│   │   │   ├── restore-backup.ts
│   │   │   ├── restoreTools.ts
│   │   │   ├── searchCloudinary.ts
│   │   │   ├── seedCustomOrderConfig.ts
│   │   │   ├── simulate_failures.ts
│   │   │   ├── smokeTest.ts
│   │   │   ├── test-alert-sim.ts
│   │   │   ├── test-github-backup.ts
│   │   │   ├── test-restore-sim.ts
│   │   │   ├── uploadAuthBg.ts
│   │   │   └── verify_backup.sh
│   │   ├── seeds
│   │   │   ├── seedData.ts
│   │   │   └── uploadAssetsToCloud.ts
│   │   ├── services
│   │   │   ├── AdminAuditService.ts
│   │   │   ├── AdminAuthService.ts
│   │   │   ├── AdminDashboardService.ts
│   │   │   ├── AdminRefundApprovalService.ts
│   │   │   ├── adminRoleReconciliationService.ts
│   │   │   ├── AdminWorkflowEngine.ts
│   │   │   ├── ai
│   │   │   │   ├── apiValidator.ts
│   │   │   │   ├── inputValidator.ts
│   │   │   │   ├── providerFactory.ts
│   │   │   │   └── providerRegistry.ts
│   │   │   ├── AlertingService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── backupService.ts
│   │   │   ├── cmsService.ts
│   │   │   ├── contentService.ts
│   │   │   ├── customOrderMailService.ts
│   │   │   ├── emailProvider.ts
│   │   │   ├── emailQueueService.ts
│   │   │   ├── eventBooking
│   │   │   │   ├── EventBookingCheckoutService.ts
│   │   │   │   ├── EventBookingStateMachine.ts
│   │   │   │   └── EventResourcePlanningService.ts
│   │   │   ├── eventBookingMailService.ts
│   │   │   ├── eventBookingService.ts
│   │   │   ├── failedEmailRetryService.ts
│   │   │   ├── FilterService.ts
│   │   │   ├── InventoryReconciliationService.ts
│   │   │   ├── InventoryService.ts
│   │   │   ├── InventorySnapshotService.ts
│   │   │   ├── logisticsService.ts
│   │   │   ├── loyaltyService.ts
│   │   │   ├── MetricsService.ts
│   │   │   ├── NotificationManager.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── orders
│   │   │   │   ├── OrderCheckoutService.ts
│   │   │   │   ├── OrderFulfillmentService.ts
│   │   │   │   ├── OrderIdempotencyManager.ts
│   │   │   │   ├── OrderNotificationService.ts
│   │   │   │   ├── OrderQueryService.ts
│   │   │   │   ├── OrderRetryService.ts
│   │   │   │   ├── OrderRollbackService.ts
│   │   │   │   └── OrderStateMachine.ts
│   │   │   ├── orderValidation.ts
│   │   │   ├── OtpAuthService.ts
│   │   │   ├── paymentReconciliationService.ts
│   │   │   ├── PaymentRefundService.ts
│   │   │   ├── payments
│   │   │   │   ├── EventBookingWebhookHandler.ts
│   │   │   │   ├── PaymentStateMachine.ts
│   │   │   │   ├── RentalWebhookHandler.ts
│   │   │   │   └── UnifiedWebhookRouter.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── PaymentVerificationService.ts
│   │   │   ├── PaymentWebhookService.ts
│   │   │   ├── privacyService.ts
│   │   │   ├── productService.ts
│   │   │   ├── PrometheusService.ts
│   │   │   ├── QueueFallbackService.ts
│   │   │   ├── recommendation
│   │   │   │   ├── coldStartHandler.ts
│   │   │   │   ├── explorationEngine.ts
│   │   │   │   ├── recommendationCache.ts
│   │   │   │   ├── recommendationEngine.ts
│   │   │   │   ├── scoringEngine.ts
│   │   │   │   ├── seasonalEngine.ts
│   │   │   │   ├── similarityEngine.ts
│   │   │   │   ├── trendingEngine.ts
│   │   │   │   └── userProfileBuilder.ts
│   │   │   ├── rentals
│   │   │   │   ├── RentalAvailabilityService.ts
│   │   │   │   ├── RentalCheckoutService.ts
│   │   │   │   ├── RentalDepositRefundService.ts
│   │   │   │   └── RentalStateMachine.ts
│   │   │   ├── rentalService.ts
│   │   │   ├── search
│   │   │   │   ├── SearchAnalyticsService.ts
│   │   │   │   ├── SearchCacheService.ts
│   │   │   │   ├── searchDictionaries.ts
│   │   │   │   └── SearchQueryBuilder.ts
│   │   │   ├── searchService.ts
│   │   │   ├── SessionAuthService.ts
│   │   │   ├── storage
│   │   │   │   ├── CloudinaryStorageProvider.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── StorageProvider.ts
│   │   │   ├── twoFactorService.ts
│   │   │   ├── visualSearchService.ts
│   │   │   └── WebhookDeadLetterService.ts
│   │   ├── socket.ts
│   │   ├── templates
│   │   │   ├── order-confirmation.hbs
│   │   │   ├── order-failed.hbs
│   │   │   └── order-status.hbs
│   │   ├── types
│   │   │   └── xss-clean.d.ts
│   │   ├── utils
│   │   │   ├── aiSanitizer.ts
│   │   │   ├── ApiError.ts
│   │   │   ├── ApiResponse.ts
│   │   │   ├── asyncHandler.ts
│   │   │   ├── authCookies.ts
│   │   │   ├── bookingId.ts
│   │   │   ├── cacheVersion.ts
│   │   │   ├── cdnHealth.ts
│   │   │   ├── ChangeTracker.ts
│   │   │   ├── CircuitBreaker.ts
│   │   │   ├── cloudinary.ts
│   │   │   ├── cronLock.ts
│   │   │   ├── DestructionGuard.ts
│   │   │   ├── DistributedLock.ts
│   │   │   ├── emailHelper.ts
│   │   │   ├── emailTemplates.ts
│   │   │   ├── featureFlags.ts
│   │   │   ├── fieldEncryption.ts
│   │   │   ├── ForensicAuditPlugin.ts
│   │   │   ├── htmlEscape.ts
│   │   │   ├── jwtBlacklist.ts
│   │   │   ├── MemoryCache.ts
│   │   │   ├── metricsTracker.ts
│   │   │   ├── MongoQueryBuilder.ts
│   │   │   ├── otpRateLimit.ts
│   │   │   ├── otpVerifyCache.ts
│   │   │   ├── pagination.ts
│   │   │   ├── paginationHeaders.ts
│   │   │   ├── pdfGenerator.ts
│   │   │   ├── performanceMonitor.ts
│   │   │   ├── RazorpayGateway.ts
│   │   │   ├── redis.ts
│   │   │   ├── referralCode.ts
│   │   │   ├── safetyLockCache.ts
│   │   │   ├── sanitize.ts
│   │   │   ├── seedImageGuard.ts
│   │   │   ├── sendEmail.ts
│   │   │   ├── sitemapGenerator.ts
│   │   │   ├── socketConnectionRateLimit.ts
│   │   │   ├── SoftDeletePlugin.ts
│   │   │   ├── ssrfProtection.ts
│   │   │   ├── templateEngine.ts
│   │   │   ├── totp.ts
│   │   │   ├── twoFactorPending.ts
│   │   │   ├── userSessionCache.ts
│   │   │   └── walletMutations.ts
│   │   └── validators
│   │       ├── authSchema.ts
│   │       ├── authValidator.ts
│   │       ├── commonValidator.ts
│   │       ├── customOrderValidator.ts
│   │       ├── eventBookingSchemas.ts
│   │       ├── eventBookingValidator.ts
│   │       ├── eventValidator.ts
│   │       ├── galleryValidator.ts
│   │       ├── inquirySchema.ts
│   │       ├── inquiryValidator.ts
│   │       ├── orderSchema.ts
│   │       ├── orderValidator.ts
│   │       ├── productValidator.ts
│   │       ├── recommendationValidator.ts
│   │       ├── rentalValidator.ts
│   │       ├── reviewValidator.ts
│   │       └── userSchema.ts
│   ├── tsconfig.jest.json
│   └── tsconfig.json
├── build-vercel.js
├── codebase_tree.md
├── docker-compose.yml
├── frontend
│   ├── .dockerignore
│   ├── .env.example
│   ├── .gitignore
│   ├── .npmrc
│   ├── api
│   │   ├── sitemap.js
│   │   └── social-proxy.js
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── _redirects
│   │   ├── .htaccess
│   │   ├── .well-known
│   │   │   └── security.txt
│   │   ├── apple-touch-icon.webp
│   │   ├── assets
│   │   │   ├── legacy_artistry_decor-mobile.webp
│   │   │   └── legacy_artistry_decor.webp
│   │   ├── favicon-32x32.webp
│   │   ├── favicon.png
│   │   ├── favicon.webp
│   │   ├── logo-mobile.webp
│   │   ├── logo-nobg-clean-sm.webp
│   │   ├── logo-nobg-clean.webp
│   │   ├── logo.png
│   │   ├── logo.webp
│   │   ├── manifest.json
│   │   ├── og-image.webp
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── sw-cleanup.js
│   ├── scripts
│   │   ├── add-lazy-loading.mjs
│   │   ├── check-env.ci.mjs
│   │   ├── cloudinary-runtime-audit.mjs
│   │   ├── full-runtime-audit.mjs
│   │   ├── postbuild.mjs
│   │   ├── report-chunk-sizes.mjs
│   │   └── split-checkout.mjs
│   ├── SECURITY.md
│   ├── src
│   │   ├── admin
│   │   │   ├── components
│   │   │   │   ├── AdminCustomOrderConfig.jsx
│   │   │   │   ├── AdminErrorBoundary.jsx
│   │   │   │   ├── AdminSidebar.jsx
│   │   │   │   ├── AdminTopBar.jsx
│   │   │   │   ├── AdminUIKit.jsx
│   │   │   │   ├── CategorySelector.jsx
│   │   │   │   ├── ConfirmDialog.jsx
│   │   │   │   ├── DraftConflictViewer.jsx
│   │   │   │   ├── DraftRestoreModal.jsx
│   │   │   │   ├── DraftStatusIndicator.jsx
│   │   │   │   ├── GlobalSearchPalette.jsx
│   │   │   │   ├── ImageUpload.jsx
│   │   │   │   ├── OccasionEditor.jsx
│   │   │   │   ├── ProductSelector.jsx
│   │   │   │   ├── UnsavedChangesGuard.jsx
│   │   │   │   └── VideoUpload.jsx
│   │   │   ├── context
│   │   │   │   ├── AdminContext.jsx
│   │   │   │   └── DraftProvider.jsx
│   │   │   ├── data
│   │   │   │   ├── adminData.js
│   │   │   │   └── websiteContentData.js
│   │   │   ├── hooks
│   │   │   │   └── useDraft.js
│   │   │   ├── layouts
│   │   │   │   └── AdminLayout.jsx
│   │   │   ├── pages
│   │   │   │   ├── AdminAddCategory.jsx
│   │   │   │   ├── AdminAddEvent.jsx
│   │   │   │   ├── AdminAddGalleryItem.jsx
│   │   │   │   ├── AdminAddProduct.jsx
│   │   │   │   ├── AdminAddShowcase.jsx
│   │   │   │   ├── AdminAnalytics.jsx
│   │   │   │   ├── AdminBookingDetail.jsx
│   │   │   │   ├── AdminCampaignCreate.jsx
│   │   │   │   ├── AdminCampaigns.jsx
│   │   │   │   ├── AdminCategories.jsx
│   │   │   │   ├── AdminConfig.jsx
│   │   │   │   ├── AdminContent.jsx
│   │   │   │   ├── AdminCoupons.jsx
│   │   │   │   ├── AdminCreateCoupon.jsx
│   │   │   │   ├── AdminCustomerProfile.jsx
│   │   │   │   ├── AdminCustomers.jsx
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AdminDrafts.jsx
│   │   │   │   ├── AdminEvents.jsx
│   │   │   │   ├── AdminGallery.jsx
│   │   │   │   ├── AdminInquiries.jsx
│   │   │   │   ├── AdminInventory.jsx
│   │   │   │   ├── AdminLayouts.jsx
│   │   │   │   ├── AdminNotifications.jsx
│   │   │   │   ├── AdminOrderDetail.jsx
│   │   │   │   ├── AdminOrders.jsx
│   │   │   │   ├── AdminPayments.jsx
│   │   │   │   ├── AdminPolicies.jsx
│   │   │   │   ├── AdminPolicyEditor.jsx
│   │   │   │   ├── AdminProducts.jsx
│   │   │   │   ├── AdminRecommendationAnalytics.jsx
│   │   │   │   ├── AdminRentalCalendar.jsx
│   │   │   │   ├── AdminRentalOrders.jsx
│   │   │   │   ├── AdminRentalPolicies.jsx
│   │   │   │   ├── AdminReviews.jsx
│   │   │   │   ├── AdminServiceAreas.jsx
│   │   │   │   ├── AdminSettings.jsx
│   │   │   │   ├── AdminSystemUsers.jsx
│   │   │   │   ├── AdminTeam.jsx
│   │   │   │   ├── AdminTemplateCreate.jsx
│   │   │   │   └── AdminVisualSearch.jsx
│   │   │   └── services
│   │   │       └── draftService.js
│   │   ├── animations
│   │   │   └── variants.js
│   │   ├── App.jsx
│   │   ├── assets
│   │   │   └── cloud_image_mappings.json
│   │   ├── checkout
│   │   │   ├── CheckoutAddressStep.jsx
│   │   │   ├── checkoutConstants.js
│   │   │   ├── CheckoutCustomizationStep.jsx
│   │   │   ├── CheckoutOrderSummaryStep.jsx
│   │   │   ├── CheckoutPaymentStep.jsx
│   │   │   ├── CheckoutProvider.jsx
│   │   │   ├── CheckoutRecommendations.jsx
│   │   │   ├── CheckoutRentalDurationStep.jsx
│   │   │   ├── CheckoutSidebar.jsx
│   │   │   └── CheckoutVerificationStep.jsx
│   │   ├── components
│   │   │   ├── auth
│   │   │   │   ├── AdminInviteModal.jsx
│   │   │   │   ├── AuthGate.jsx
│   │   │   │   ├── AuthModal.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── blog
│   │   │   │   └── BlogCard.jsx
│   │   │   ├── cart
│   │   │   │   └── CartView.jsx
│   │   │   ├── dashboard
│   │   │   │   ├── AddressCard.jsx
│   │   │   │   ├── AddressModal.jsx
│   │   │   │   ├── DashboardHeader.jsx
│   │   │   │   ├── OrderCard.jsx
│   │   │   │   ├── OrderDetail.jsx
│   │   │   │   ├── OrdersTab.jsx
│   │   │   │   ├── ProfileTab.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── StatCards.jsx
│   │   │   ├── gallery
│   │   │   │   ├── GalleryCard.jsx
│   │   │   │   ├── GallerySlideshow.jsx
│   │   │   │   └── VirtualizedMasonry.jsx
│   │   │   ├── homepage
│   │   │   │   └── HomeSectionState.jsx
│   │   │   ├── layout
│   │   │   │   ├── BottomNav.jsx
│   │   │   │   ├── CartDrawer.jsx
│   │   │   │   ├── CheckoutNavbar.jsx
│   │   │   │   ├── ConsentPopup.jsx
│   │   │   │   ├── DynamicSectionRenderer.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── index.js
│   │   │   │   ├── PolicySidebar.jsx
│   │   │   │   ├── SectionWrapper.jsx
│   │   │   │   ├── StackedSectionWrapper.jsx
│   │   │   │   └── TopNavbar.jsx
│   │   │   ├── loyalty
│   │   │   │   └── LoyaltyPanel.jsx
│   │   │   ├── reviews
│   │   │   │   ├── PostReviewModal.jsx
│   │   │   │   └── ReviewLightbox.jsx
│   │   │   ├── search
│   │   │   │   ├── IntelligentSearchOverlay.jsx
│   │   │   │   └── VisualSearchOverlay.jsx
│   │   │   ├── sections
│   │   │   │   ├── BestsellerSection.jsx
│   │   │   │   ├── DynamicHomepageFeed.jsx
│   │   │   │   ├── GallerySection.jsx
│   │   │   │   ├── HeroSection.jsx
│   │   │   │   ├── NavigationHub.jsx
│   │   │   │   ├── PersonalizedFeed.jsx
│   │   │   │   ├── ProductReviews.jsx
│   │   │   │   ├── RecommendationSystem.jsx
│   │   │   │   ├── SeasonalHighlights.jsx
│   │   │   │   ├── StorySection.jsx
│   │   │   │   ├── TrendingSection.jsx
│   │   │   │   └── VerifiedReviews.jsx
│   │   │   ├── seo
│   │   │   │   ├── FAQAccordion.jsx
│   │   │   │   └── SEO.jsx
│   │   │   ├── shared
│   │   │   │   ├── CarouselWrapper.jsx
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   └── SectionHeader.jsx
│   │   │   ├── ui
│   │   │   │   ├── __tests__
│   │   │   │   │   ├── a11y.smoke.test.jsx
│   │   │   │   │   ├── Button.test.jsx
│   │   │   │   │   ├── FeedbackStates.test.jsx
│   │   │   │   │   ├── ProductCard.test.jsx
│   │   │   │   │   └── SearchBar.test.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── CategoryTabs.jsx
│   │   │   │   ├── CheckoutSteps.jsx
│   │   │   │   ├── CloudflareVerification.jsx
│   │   │   │   ├── CloudinaryImage.jsx
│   │   │   │   ├── CustomDropdown.jsx
│   │   │   │   ├── CustomizationFields.jsx
│   │   │   │   ├── DynamicCustomOrderWizard.jsx
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   ├── EventFilterPanel.jsx
│   │   │   │   ├── EventShowcaseFilterPanel.jsx
│   │   │   │   ├── FeedbackStates.jsx
│   │   │   │   ├── FilterPanel.jsx
│   │   │   │   ├── FormField.jsx
│   │   │   │   ├── GlobalTracker.jsx
│   │   │   │   ├── Icon.jsx
│   │   │   │   ├── index.js
│   │   │   │   ├── InvoiceTemplate.jsx
│   │   │   │   ├── LazyImage.jsx
│   │   │   │   ├── LazySection.jsx
│   │   │   │   ├── LocationSelectorModal.jsx
│   │   │   │   ├── MandalaArtDecor.jsx
│   │   │   │   ├── MandalaElement.jsx
│   │   │   │   ├── NavigationOrchestrator.jsx
│   │   │   │   ├── NoInternetOverlay.jsx
│   │   │   │   ├── OptimizedImage.jsx
│   │   │   │   ├── PageLoader.jsx
│   │   │   │   ├── Pagination.jsx
│   │   │   │   ├── PremiumFilterOverlay.jsx
│   │   │   │   ├── PremiumRecommendationCard.jsx
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   ├── ProductGallery.jsx
│   │   │   │   ├── ProductInfo.jsx
│   │   │   │   ├── PromoBanner.jsx
│   │   │   │   ├── PwaUpdatePrompt.jsx
│   │   │   │   ├── QuickViewModal.jsx
│   │   │   │   ├── RecommendationCarousel.jsx
│   │   │   │   ├── RetryBlock.jsx
│   │   │   │   ├── RouteSkeleton.jsx
│   │   │   │   ├── ScrollManager.jsx
│   │   │   │   ├── SearchBar.jsx
│   │   │   │   ├── ShareButton.jsx
│   │   │   │   ├── ShowcaseCard.jsx
│   │   │   │   ├── SiriLogo.jsx
│   │   │   │   ├── Skeleton.jsx
│   │   │   │   ├── SkeletonBase.jsx
│   │   │   │   ├── SlowConnectionBanner.jsx
│   │   │   │   ├── SplashScreen.jsx
│   │   │   │   ├── StateRenderer.jsx
│   │   │   │   ├── StickyMobileATC.jsx
│   │   │   │   └── WhatsAppWidget.jsx
│   │   │   └── wishlist
│   │   │       └── WishlistView.jsx
│   │   ├── config
│   │   │   ├── apiConfig.js
│   │   │   └── constants.js
│   │   ├── constants
│   │   │   ├── assets.js
│   │   │   ├── brandEnv.js
│   │   │   ├── design-tokens.js
│   │   │   ├── emptyWebsiteContent.js
│   │   │   ├── mandalaAssets.js
│   │   │   └── placeholderImages.js
│   │   ├── content
│   │   │   ├── blogs.json
│   │   │   └── locations.json
│   │   ├── context
│   │   │   ├── AuthContext.jsx
│   │   │   ├── AuthProvider.jsx
│   │   │   ├── CartContext.jsx
│   │   │   ├── CartProvider.jsx
│   │   │   ├── ConfigContext.jsx
│   │   │   ├── DashboardContext.jsx
│   │   │   ├── NetworkContext.jsx
│   │   │   ├── NetworkProvider.jsx
│   │   │   ├── UserSocketProvider.jsx
│   │   │   ├── WishlistContext.jsx
│   │   │   └── WishlistProvider.jsx
│   │   ├── hooks
│   │   │   ├── __tests__
│   │   │   │   ├── useMediaQuery.test.js
│   │   │   │   └── useWindowHeight.test.js
│   │   │   ├── useApi.js
│   │   │   ├── useCartQueries.js
│   │   │   ├── useDashboardData.js
│   │   │   ├── useInfiniteGallery.js
│   │   │   ├── useMediaQuery.js
│   │   │   ├── usePersonalizedSections.js
│   │   │   ├── useProductQueries.js
│   │   │   ├── useRazorpay.jsx
│   │   │   ├── useRecommendationQueries.js
│   │   │   ├── useRecommendationTracker.js
│   │   │   ├── useScrollDirection.js
│   │   │   ├── useSearchOverlay.js
│   │   │   ├── useSearchQueries.js
│   │   │   ├── useUserQueries.js
│   │   │   ├── useVisualSearch.js
│   │   │   ├── useWebsiteContent.js
│   │   │   └── useWindowHeight.js
│   │   ├── layouts
│   │   │   └── MainLayout.jsx
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── About.jsx
│   │   │   ├── AcceptInvite.jsx
│   │   │   ├── BlogListing.jsx
│   │   │   ├── BlogPost.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── CollectionDetail.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── Coupons.jsx
│   │   │   ├── CustomizationStudio.jsx
│   │   │   ├── CustomOrders.jsx
│   │   │   ├── Dashboard
│   │   │   │   ├── AddressesSection.jsx
│   │   │   │   ├── CollectionsSection.jsx
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── EventsSection.jsx
│   │   │   │   ├── OrdersSection.jsx
│   │   │   │   ├── ProfileSection.jsx
│   │   │   │   ├── RentalsSection.jsx
│   │   │   │   ├── SettingsSection.jsx
│   │   │   │   ├── ShoppingBagSection.jsx
│   │   │   │   └── WalletSection.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EventBookingSuccess.jsx
│   │   │   ├── EventBookingWizard.jsx
│   │   │   ├── EventCollections.jsx
│   │   │   ├── EventCustomerDashboard.jsx
│   │   │   ├── EventDetail.jsx
│   │   │   ├── EventShowcases.jsx
│   │   │   ├── Gallery.jsx
│   │   │   ├── GalleryDetail.jsx
│   │   │   ├── GPSMapLazy.jsx
│   │   │   ├── Home
│   │   │   │   ├── home.css
│   │   │   │   ├── Home.jsx
│   │   │   │   └── sections
│   │   │   │       ├── BestSellers.jsx
│   │   │   │       ├── CategoryGrid.jsx
│   │   │   │       ├── GalleryInspiration.jsx
│   │   │   │       ├── HeroCarousel.jsx
│   │   │   │       ├── PromoBanner.jsx
│   │   │   │       ├── RecommendedGrid.jsx
│   │   │   │       ├── ShopByOccasion.jsx
│   │   │   │       └── TrendingProducts.jsx
│   │   │   ├── LocationLanding.jsx
│   │   │   ├── MyCustomOrders.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── OrderSuccess.jsx
│   │   │   ├── OrderTrackingPublic.jsx
│   │   │   ├── Privacy.jsx
│   │   │   ├── ProductAllReviews.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── ProductListing.jsx
│   │   │   ├── ProductReviewImages.jsx
│   │   │   ├── Returns.jsx
│   │   │   ├── Shipping.jsx
│   │   │   ├── Terms.jsx
│   │   │   └── Wishlist.jsx
│   │   ├── services
│   │   │   ├── api
│   │   │   │   ├── _shared.js
│   │   │   │   ├── adminInviteService.js
│   │   │   │   ├── analyticsService.js
│   │   │   │   ├── authService.js
│   │   │   │   ├── bookingService.js
│   │   │   │   ├── cmsService.js
│   │   │   │   ├── couponService.js
│   │   │   │   ├── customOrderService.js
│   │   │   │   ├── eventService.js
│   │   │   │   ├── galleryService.js
│   │   │   │   ├── homepageService.js
│   │   │   │   ├── inquiryService.js
│   │   │   │   ├── loyaltyService.js
│   │   │   │   ├── notificationService.js
│   │   │   │   ├── orderService.js
│   │   │   │   ├── policyService.js
│   │   │   │   ├── productService.js
│   │   │   │   ├── reviewService.js
│   │   │   │   ├── showcaseService.js
│   │   │   │   ├── uploadService.js
│   │   │   │   └── userService.js
│   │   │   ├── api.js
│   │   │   ├── domainServices.js
│   │   │   ├── recommendationService.js
│   │   │   ├── rentalService.js
│   │   │   ├── searchService.js
│   │   │   └── visualSearchService.js
│   │   ├── styles
│   │   │   ├── admin.css
│   │   │   ├── globals.css
│   │   │   └── visual-search.css
│   │   ├── test
│   │   │   └── setup.js
│   │   ├── utils
│   │   │   ├── analytics.js
│   │   │   ├── apiCache.js
│   │   │   ├── apiErrors.js
│   │   │   ├── apiUrl.js
│   │   │   ├── audioUtils.js
│   │   │   ├── authSessionCache.js
│   │   │   ├── authStorage.js
│   │   │   ├── bootstrap.js
│   │   │   ├── cmsMediaGovernance.js
│   │   │   ├── diagnostics.js
│   │   │   ├── errorHelpers.js
│   │   │   ├── imageCompressor.js
│   │   │   ├── imageUtils.js
│   │   │   ├── lazyWithRetry.js
│   │   │   ├── logger.js
│   │   │   ├── observability.js
│   │   │   ├── performanceMonitor.js
│   │   │   ├── persistentStorage.js
│   │   │   ├── prefetchManager.js
│   │   │   ├── prerender.js
│   │   │   ├── queryPersister.js
│   │   │   ├── sanitize.js
│   │   │   └── storage.js
│   │   └── vite-env.d.ts
│   ├── vercel.json
│   └── vite.config.js
├── nginx.example.conf
├── package-lock.json
├── package.json
├── README.md
└── scripts
    ├── check-no-console.mjs
    └── optimize-assets.mjs

## Gitignored Elements

Below are the elements and patterns ignored by Git across the workspace:

### Root .gitignore (c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/.gitignore)
```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Directories
node_modules/
dist/
dist-ssr/
build/
.cache/
coverage/

# OS Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment Variables
.env
.env.*
!.env.example
*.secret
.env.backup

# Documents
*.docx
*.pdf
*.pptx

# Audit Artifacts & Temp Scripts
scripts/extract_arch.js
backend/test-mongoose.js

# Recovery & Diagnostics
backend/recovery/
backend/cache/
backend/recovered_products_preview.json
backend/old_seed_data_temp.txt
backend/test-*.ts
*.avif
tmp/

# Temp Scripts & Audits
patch_frontend.py
backend/fix-image.js
backend/fix-all-images.js
frontend/replaceImports.cjs
migration_report.md
backend/knip-report.json
frontend/knip-report.json
frontend/stats.html
frontend/stats.json
stats.json
backend/migration_report_full.md

# Agent directories
brain/

# Profiling & debug
prof*.txt
*.prof
# Load test results
load_tests/
load-tests.yml
# Audit artifacts
*-audit-report*.json
audit_performance.*
runtime-audit*
# Cached media
backend/cache/
# Filter debug
filters*.json
explain_output.json

# Hardened Generated Artifacts Phase
coverage/
cache/
logs/
*.log
stats.html
stats.json
knip-report.json
codebase_report.txt
codebase_tree_report.txt
```

### Backend .gitignore (c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/backend/.gitignore)
```gitignore
node_modules/
dist/
.env
*.log
v8.log
isolate-*.log
*-report.json
```

### Frontend .gitignore (c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/frontend/.gitignore)
```gitignore
stats.html
stats.json
*.log
*-report.json
```
