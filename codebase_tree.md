```txt
C:\Users\Dhanush\OneDrive\Desktop\PROJECTS\EventDecor
├── .github
    ├── workflows
    │   └── ci.yml
    └── dependabot.yml
├── .husky
    ├── _
    │   ├── .gitignore
    │   ├── applypatch-msg
    │   ├── commit-msg
    │   ├── h
    │   ├── husky.sh
    │   ├── post-applypatch
    │   ├── post-checkout
    │   ├── post-commit
    │   ├── post-merge
    │   ├── post-rewrite
    │   ├── pre-applypatch
    │   ├── pre-auto-gc
    │   ├── pre-commit
    │   ├── pre-merge-commit
    │   ├── pre-push
    │   ├── pre-rebase
    │   └── prepare-commit-msg
    └── pre-commit
├── backend
    ├── cache
    │   ├── 2dc778a29c920f707e168a28b6349c1bc79f89a54e3c3c121d8b22e92fb8bb97.webp
    │   ├── b235f065c3a8f4d73bafdf52d6796010b3e331c1b8e7d81e994e67d4d893963b.jpeg
    │   ├── b7baa13a8a0fc042cc687005995d8c4cdd3a666e60374a2a5ae1b4512f86a06a.jpeg
    │   └── caf7db398c95c330841a232a8b4993e674137250d58656fe3708fb98568d4de3.avif
    ├── migrations
    │   └── README.md
    ├── ops
    │   ├── audits
    │   │   ├── check_categories.js
    │   │   ├── check_products.js
    │   │   ├── check-admins.js
    │   │   ├── check-reviews.js
    │   │   ├── cloudinaryExport.js
    │   │   ├── exportCurrentDb.js
    │   │   ├── list-users.js
    │   │   ├── post_migration_audit.ts
    │   │   ├── queryAuditLogs.js
    │   │   └── run-explains.ts
    │   ├── maintenance
    │   │   ├── activate_products.js
    │   │   ├── fixRazorpayPaths.js
    │   │   └── refactorRazorpay.js
    │   ├── migrations
    │   │   └── add-missing-indexes.ts
    │   ├── recovery
    │   │   ├── extractProductsFromAudit.js
    │   │   ├── importRecoveredProducts.js
    │   │   ├── reconstructProducts.js
    │   │   └── verifyBackup.js
    │   └── testing
    │   │   ├── run-matrix.js
    │   │   ├── run-test.js
    │   │   └── testImageUrls.ts
    ├── public
    ├── scripts
    │   ├── search_baseline.json
    │   ├── searchPerformance.js
    │   ├── searchPerformance.ts
    │   ├── simulate_dr_drill.ts
    │   ├── simulate_razorpay_e2e.ts
    │   └── validate_env.ts
    ├── src
    │   ├── __tests__
    │   │   ├── __snapshots__
    │   │   │   └── search.snapshot.test.ts.snap
    │   │   ├── chaos
    │   │   │   └── resilience.test.ts
    │   │   ├── load
    │   │   │   └── k6-load-test.js
    │   │   ├── admin-refund-approval.test.ts
    │   │   ├── adminInvite.test.ts
    │   │   ├── api.integration.test.ts
    │   │   ├── auth.integration.test.ts
    │   │   ├── csrf.test.ts
    │   │   ├── fieldEncryption.test.ts
    │   │   ├── inventory-reservation.test.ts
    │   │   ├── inventory.integration.test.ts
    │   │   ├── media.integration.test.ts
    │   │   ├── modelTtlIndexes.test.ts
    │   │   ├── my-orders-filter.test.ts
    │   │   ├── order-checkout.test.ts
    │   │   ├── otp-auth.test.ts
    │   │   ├── payment-refund.test.ts
    │   │   ├── payment-state-machine.test.ts
    │   │   ├── payment-webhook-idempotency.test.ts
    │   │   ├── payment.integration.test.ts
    │   │   ├── rateLimit.integration.test.ts
    │   │   ├── recommendation.integration.test.ts
    │   │   ├── rental-block.test.ts
    │   │   ├── search-cache.test.ts
    │   │   ├── search.snapshot.test.ts
    │   │   ├── search.test.ts
    │   │   ├── security.test.ts
    │   │   ├── session-auth.test.ts
    │   │   ├── setupEnv.ts
    │   │   ├── socket.integration.test.ts
    │   │   ├── tsconfig.json
    │   │   ├── upload-security.test.ts
    │   │   ├── upload.integration.test.ts
    │   │   └── webhook.integration.test.ts
    │   ├── config
    │   │   ├── adminConfig.ts
    │   │   ├── cloudinary.ts
    │   │   ├── cookieConfig.ts
    │   │   ├── corsConfig.ts
    │   │   ├── db.ts
    │   │   ├── dbAuditor.ts
    │   │   ├── ensureIndexes.ts
    │   │   ├── env.ts
    │   │   ├── envSchema.ts
    │   │   ├── envValidation.ts
    │   │   ├── loadEnv.ts
    │   │   ├── logger.ts
    │   │   ├── razorpay.ts
    │   │   ├── secretAudit.ts
    │   │   ├── socketState.ts
    │   │   └── startupValidator.ts
    │   ├── constants
    │   │   ├── loyaltyTiers.ts
    │   │   └── placeholderImages.ts
    │   ├── controllers
    │   │   ├── adminAuthController.ts
    │   │   ├── adminInviteController.ts
    │   │   ├── adminManagementController.ts
    │   │   ├── adminNotificationController.ts
    │   │   ├── aiVisionController.ts
    │   │   ├── analyticsController.ts
    │   │   ├── appConfigController.ts
    │   │   ├── authController.ts
    │   │   ├── categoryController.ts
    │   │   ├── cmsController.ts
    │   │   ├── contentController.ts
    │   │   ├── couponController.ts
    │   │   ├── customOrderController.ts
    │   │   ├── eventBookingController.ts
    │   │   ├── eventController.ts
    │   │   ├── galleryController.ts
    │   │   ├── healthController.ts
    │   │   ├── inquiryController.ts
    │   │   ├── loyaltyController.ts
    │   │   ├── mediaController.ts
    │   │   ├── notificationController.ts
    │   │   ├── orderController.ts
    │   │   ├── pageLayoutController.ts
    │   │   ├── paymentReconciliationController.ts
    │   │   ├── personalizedSectionsController.ts
    │   │   ├── policyController.ts
    │   │   ├── privacyController.ts
    │   │   ├── productController.ts
    │   │   ├── recommendationAnalyticsController.ts
    │   │   ├── recommendationController.ts
    │   │   ├── refundController.ts
    │   │   ├── rentalController.ts
    │   │   ├── rentalPolicyController.ts
    │   │   ├── reviewController.ts
    │   │   ├── searchController.ts
    │   │   ├── serviceAreaController.ts
    │   │   ├── showcaseController.ts
    │   │   ├── socialController.ts
    │   │   ├── trackingController.ts
    │   │   ├── twoFactorController.ts
    │   │   ├── uploadController.ts
    │   │   ├── userController.ts
    │   │   └── visualSearchController.ts
    │   ├── jobs
    │   │   ├── backupJob.ts
    │   │   ├── backupVerification.ts
    │   │   ├── cronJobs.ts
    │   │   ├── dailyBackupJob.ts
    │   │   ├── DataMonitorJob.ts
    │   │   ├── healthMonitorJob.ts
    │   │   ├── orphanAssetCleanup.ts
    │   │   ├── outboxProcessor.ts
    │   │   ├── PaymentReconciliationJob.ts
    │   │   ├── queues.ts
    │   │   ├── rentalCronJobs.ts
    │   │   ├── staleOrderCleanup.ts
    │   │   └── workers.ts
    │   ├── middleware
    │   │   ├── apiVersion.ts
    │   │   ├── authMiddleware.ts
    │   │   ├── cacheHeaders.ts
    │   │   ├── cacheMiddleware.ts
    │   │   ├── corsMiddleware.ts
    │   │   ├── csrfMiddleware.ts
    │   │   ├── dbReadinessGuard.ts
    │   │   ├── dynamicCacheMiddleware.ts
    │   │   ├── enforceHttps.ts
    │   │   ├── errorMiddleware.ts
    │   │   ├── helmetMiddleware.ts
    │   │   ├── noCacheMiddleware.ts
    │   │   ├── queryGuard.ts
    │   │   ├── queryTimeout.ts
    │   │   ├── rateLimiter.ts
    │   │   ├── requestLogger.ts
    │   │   ├── requestTracker.ts
    │   │   ├── upload.ts
    │   │   ├── validateMiddleware.ts
    │   │   └── zodValidationMiddleware.ts
    │   ├── models
    │   │   ├── Address.ts
    │   │   ├── AdminAuditLog.ts
    │   │   ├── AdminInvite.ts
    │   │   ├── AdminNotification.ts
    │   │   ├── AppConfig.ts
    │   │   ├── BookingMessage.ts
    │   │   ├── Category.ts
    │   │   ├── ConsentPreference.ts
    │   │   ├── ContentSection.ts
    │   │   ├── Counter.ts
    │   │   ├── Coupon.ts
    │   │   ├── CustomOrder.ts
    │   │   ├── CustomOrderConfig.ts
    │   │   ├── EmailCampaign.ts
    │   │   ├── EmailTemplate.ts
    │   │   ├── Event.ts
    │   │   ├── EventBooking.ts
    │   │   ├── FailedEmailJob.ts
    │   │   ├── FailedLoginAttempt.ts
    │   │   ├── Gallery.ts
    │   │   ├── Inquiry.ts
    │   │   ├── InventoryLedger.ts
    │   │   ├── InventoryLog.ts
    │   │   ├── InventoryReservation.ts
    │   │   ├── NotificationLog.ts
    │   │   ├── Order.ts
    │   │   ├── OtpRequestLog.ts
    │   │   ├── OtpVerification.ts
    │   │   ├── OutboxEvent.ts
    │   │   ├── PageLayout.ts
    │   │   ├── PasswordResetToken.ts
    │   │   ├── PaymentAudit.ts
    │   │   ├── PaymentWebhookEvent.ts
    │   │   ├── Policy.ts
    │   │   ├── Product.ts
    │   │   ├── RecycleBin.ts
    │   │   ├── RefreshToken.ts
    │   │   ├── RefundRecord.ts
    │   │   ├── RentalCalendar.ts
    │   │   ├── RentalDayBlock.ts
    │   │   ├── RentalInspection.ts
    │   │   ├── RentalOrder.ts
    │   │   ├── RentalPolicy.ts
    │   │   ├── Review.ts
    │   │   ├── ServiceArea.ts
    │   │   ├── ShowcaseCollection.ts
    │   │   ├── TeamInvite.ts
    │   │   ├── TrendingSnapshot.ts
    │   │   ├── UsedRefreshToken.ts
    │   │   ├── User.ts
    │   │   ├── UserInteraction.ts
    │   │   ├── UserPreferenceProfile.ts
    │   │   ├── VersionHistory.ts
    │   │   ├── VisualSearchConfig.ts
    │   │   ├── VisualSearchLog.ts
    │   │   ├── WalletTransaction.ts
    │   │   └── WebsiteContent.ts
    │   ├── queues
    │   ├── routes
    │   │   ├── adminInviteRoutes.ts
    │   │   ├── adminSystemRoutes.ts
    │   │   ├── analyticsRoutes.ts
    │   │   ├── appConfigRoutes.ts
    │   │   ├── authRoutes.ts
    │   │   ├── categoryRoutes.ts
    │   │   ├── cmsRoutes.ts
    │   │   ├── couponRoutes.ts
    │   │   ├── customOrderRoutes.ts
    │   │   ├── eventBookingRoutes.ts
    │   │   ├── eventRoutes.ts
    │   │   ├── galleryRoutes.ts
    │   │   ├── healthRoutes.ts
    │   │   ├── inquiryRoutes.ts
    │   │   ├── loyaltyRoutes.ts
    │   │   ├── mediaRoutes.ts
    │   │   ├── metricsRoutes.ts
    │   │   ├── notificationRoutes.ts
    │   │   ├── orderRoutes.ts
    │   │   ├── pageLayoutRoutes.ts
    │   │   ├── policyRoutes.ts
    │   │   ├── productRoutes.ts
    │   │   ├── recommendationAnalyticsRoutes.ts
    │   │   ├── recommendationRoutes.ts
    │   │   ├── refundRoutes.ts
    │   │   ├── registerApiRoutes.ts
    │   │   ├── rentalPolicyRoutes.ts
    │   │   ├── rentalRoutes.ts
    │   │   ├── reviewRoutes.ts
    │   │   ├── searchRoutes.ts
    │   │   ├── serviceAreaRoutes.ts
    │   │   ├── showcaseRoutes.ts
    │   │   ├── socialRoutes.ts
    │   │   ├── trackingRoutes.ts
    │   │   ├── uploadRoutes.ts
    │   │   ├── userRoutes.ts
    │   │   └── visualSearchRoutes.ts
    │   ├── scripts
    │   │   ├── backupDb.ts
    │   │   ├── backupMedia.ts
    │   │   ├── checkEnv.ci.ts
    │   │   ├── checkUsers.ts
    │   │   ├── cloudflareAudit.ts
    │   │   ├── createAdmin.ts
    │   │   ├── createIndexes.ts
    │   │   ├── cronBackup.ts
    │   │   ├── findFloralProducts.ts
    │   │   ├── fix-and-tag.ts
    │   │   ├── fix-object-ids.ts
    │   │   ├── restore-backup.ts
    │   │   ├── restoreTools.ts
    │   │   ├── searchCloudinary.ts
    │   │   ├── seedCustomOrderConfig.ts
    │   │   ├── simulate_failures.ts
    │   │   ├── smokeTest.ts
    │   │   ├── test-alert-sim.ts
    │   │   ├── test-github-backup.ts
    │   │   ├── test-restore-sim.ts
    │   │   ├── testBackupRestore.ts
    │   │   ├── uploadAuthBg.ts
    │   │   └── verify_backup.sh
    │   ├── seeds
    │   │   ├── seedData.ts
    │   │   └── uploadAssetsToCloud.ts
    │   ├── services
    │   │   ├── ai
    │   │   │   ├── apiValidator.ts
    │   │   │   ├── inputValidator.ts
    │   │   │   ├── providerFactory.ts
    │   │   │   └── providerRegistry.ts
    │   │   ├── eventBooking
    │   │   │   ├── EventBookingCheckoutService.ts
    │   │   │   ├── EventBookingStateMachine.ts
    │   │   │   └── EventResourcePlanningService.ts
    │   │   ├── orders
    │   │   │   ├── OrderCheckoutService.ts
    │   │   │   ├── OrderFulfillmentService.ts
    │   │   │   ├── OrderIdempotencyManager.ts
    │   │   │   ├── OrderNotificationService.ts
    │   │   │   ├── OrderQueryService.ts
    │   │   │   ├── OrderRetryService.ts
    │   │   │   ├── OrderRollbackService.ts
    │   │   │   └── OrderStateMachine.ts
    │   │   ├── payments
    │   │   │   ├── EventBookingWebhookHandler.ts
    │   │   │   ├── PaymentStateMachine.ts
    │   │   │   ├── RentalWebhookHandler.ts
    │   │   │   └── UnifiedWebhookRouter.ts
    │   │   ├── recommendation
    │   │   │   ├── coldStartHandler.ts
    │   │   │   ├── explorationEngine.ts
    │   │   │   ├── recommendationCache.ts
    │   │   │   ├── recommendationEngine.ts
    │   │   │   ├── scoringEngine.ts
    │   │   │   ├── seasonalEngine.ts
    │   │   │   ├── similarityEngine.ts
    │   │   │   ├── trendingEngine.ts
    │   │   │   └── userProfileBuilder.ts
    │   │   ├── rentals
    │   │   │   ├── RentalAvailabilityService.ts
    │   │   │   ├── RentalCheckoutService.ts
    │   │   │   ├── RentalDepositRefundService.ts
    │   │   │   └── RentalStateMachine.ts
    │   │   ├── search
    │   │   │   ├── filteringEngine.ts
    │   │   │   ├── queryParser.ts
    │   │   │   ├── rankingEngine.ts
    │   │   │   ├── SearchAnalyticsService.ts
    │   │   │   ├── searchCache.ts
    │   │   │   ├── SearchCacheService.ts
    │   │   │   ├── searchDictionaries.ts
    │   │   │   └── SearchQueryBuilder.ts
    │   │   ├── storage
    │   │   │   ├── CloudinaryStorageProvider.ts
    │   │   │   ├── index.ts
    │   │   │   └── StorageProvider.ts
    │   │   ├── visualSearch
    │   │   │   ├── embeddingEngine.ts
    │   │   │   └── similarityEngine.ts
    │   │   ├── AdminAuditService.ts
    │   │   ├── AdminAuthService.ts
    │   │   ├── AdminDashboardService.ts
    │   │   ├── AdminRefundApprovalService.ts
    │   │   ├── adminRoleReconciliationService.ts
    │   │   ├── AlertingService.ts
    │   │   ├── analyticsService.ts
    │   │   ├── backupService.ts
    │   │   ├── cmsService.ts
    │   │   ├── contentService.ts
    │   │   ├── customOrderMailService.ts
    │   │   ├── emailProvider.ts
    │   │   ├── emailQueueService.ts
    │   │   ├── eventBookingMailService.ts
    │   │   ├── eventBookingService.ts
    │   │   ├── failedEmailRetryService.ts
    │   │   ├── FilterService.ts
    │   │   ├── InventoryReconciliationService.ts
    │   │   ├── InventoryService.ts
    │   │   ├── logisticsService.ts
    │   │   ├── loyaltyService.ts
    │   │   ├── MetricsService.ts
    │   │   ├── notificationService.ts
    │   │   ├── orderValidation.ts
    │   │   ├── OtpAuthService.ts
    │   │   ├── paymentReconciliationService.ts
    │   │   ├── PaymentRefundService.ts
    │   │   ├── paymentService.ts
    │   │   ├── PaymentVerificationService.ts
    │   │   ├── PaymentWebhookService.ts
    │   │   ├── privacyService.ts
    │   │   ├── productService.ts
    │   │   ├── PrometheusService.ts
    │   │   ├── QueueFallbackService.ts
    │   │   ├── rentalService.ts
    │   │   ├── searchService.ts
    │   │   ├── SessionAuthService.ts
    │   │   ├── twoFactorService.ts
    │   │   ├── visualSearchService.ts
    │   │   └── WebhookDeadLetterService.ts
    │   ├── templates
    │   │   ├── order-confirmation.hbs
    │   │   ├── order-failed.hbs
    │   │   └── order-status.hbs
    │   ├── types
    │   ├── utils
    │   │   ├── aiSanitizer.ts
    │   │   ├── ApiError.ts
    │   │   ├── ApiResponse.ts
    │   │   ├── asyncHandler.ts
    │   │   ├── authCookies.ts
    │   │   ├── bookingId.ts
    │   │   ├── cacheVersion.ts
    │   │   ├── cdnHealth.ts
    │   │   ├── ChangeTracker.ts
    │   │   ├── CircuitBreaker.ts
    │   │   ├── cloudinary.ts
    │   │   ├── cronLock.ts
    │   │   ├── DestructionGuard.ts
    │   │   ├── DistributedLock.ts
    │   │   ├── emailHelper.ts
    │   │   ├── emailTemplates.ts
    │   │   ├── featureFlags.ts
    │   │   ├── fieldEncryption.ts
    │   │   ├── ForensicAuditPlugin.ts
    │   │   ├── htmlEscape.ts
    │   │   ├── jwtBlacklist.ts
    │   │   ├── MemoryCache.ts
    │   │   ├── metricsTracker.ts
    │   │   ├── MongoQueryBuilder.ts
    │   │   ├── otpRateLimit.ts
    │   │   ├── otpVerifyCache.ts
    │   │   ├── pagination.ts
    │   │   ├── paginationHeaders.ts
    │   │   ├── pdfGenerator.ts
    │   │   ├── performanceMonitor.ts
    │   │   ├── RazorpayGateway.ts
    │   │   ├── redis.ts
    │   │   ├── referralCode.ts
    │   │   ├── safetyLockCache.ts
    │   │   ├── sanitize.ts
    │   │   ├── seedImageGuard.ts
    │   │   ├── sendEmail.ts
    │   │   ├── sitemapGenerator.ts
    │   │   ├── socketConnectionRateLimit.ts
    │   │   ├── SoftDeletePlugin.ts
    │   │   ├── ssrfProtection.ts
    │   │   ├── templateEngine.ts
    │   │   ├── totp.ts
    │   │   ├── twoFactorPending.ts
    │   │   ├── userSessionCache.ts
    │   │   ├── walletMutations.ts
    │   │   └── xssSanitizer.ts
    │   ├── validators
    │   │   ├── authSchema.ts
    │   │   ├── authValidator.ts
    │   │   ├── commonValidator.ts
    │   │   ├── customOrderValidator.ts
    │   │   ├── eventBookingSchemas.ts
    │   │   ├── eventBookingValidator.ts
    │   │   ├── eventValidator.ts
    │   │   ├── galleryValidator.ts
    │   │   ├── inquirySchema.ts
    │   │   ├── inquiryValidator.ts
    │   │   ├── orderSchema.ts
    │   │   ├── orderValidator.ts
    │   │   ├── productValidator.ts
    │   │   ├── recommendationValidator.ts
    │   │   ├── rentalValidator.ts
    │   │   ├── reviewValidator.ts
    │   │   └── userSchema.ts
    │   ├── workers
    │   ├── app.ts
    │   └── socket.ts
    ├── .dockerignore
    ├── .env.example
    ├── .env.local
    ├── .env.production.checklist.md
    ├── .gitignore
    ├── .npmrc
    ├── AI_SECURITY.md
    ├── cleanVSS.js
    ├── DISASTER_RECOVERY.md
    ├── Dockerfile
    ├── ecosystem.config.js
    ├── eslint.config.mjs
    ├── formatSimilarity.js
    ├── generateEngines.js
    ├── jest.config.cjs
    ├── package-lock.json
    ├── package.json
    ├── PERFORMANCE_OPTIMIZATION.md
    ├── railway.json
    ├── README.md
    ├── reconstruct.js
    ├── render.yaml
    ├── SCALING.md
    ├── script.js
    ├── server.ts
    ├── ts_output.txt
    ├── tsconfig.jest.json
    └── tsconfig.json
├── backups
    └── daily
    │   └── 2026-06-19
    │       ├── _backup_manifest.json
    │       ├── categories.json
    │       ├── customorders.json
    │       ├── inventoryledgers.json
    │       ├── inventoryreservations.json
    │       ├── orders.json
    │       ├── paymentaudits.json
    │       ├── products.json
    │       ├── reviews.json
    │       ├── users.json
    │       └── wallettransactions.json
├── frontend
    ├── api
    │   ├── sitemap.js
    │   └── social-proxy.js
    ├── public
    │   ├── .well-known
    │   │   └── security.txt
    │   ├── assets
    │   │   ├── products
    │   │   ├── team
    │   │   ├── legacy_artistry_decor-mobile.webp
    │   │   └── legacy_artistry_decor.webp
    │   ├── occasions
    │   ├── _redirects
    │   ├── .htaccess
    │   ├── apple-touch-icon.webp
    │   ├── favicon-32x32.webp
    │   ├── favicon.png
    │   ├── favicon.webp
    │   ├── logo-mobile.webp
    │   ├── logo-nobg-clean-sm.webp
    │   ├── logo-nobg-clean.webp
    │   ├── logo.png
    │   ├── logo.webp
    │   ├── manifest.json
    │   ├── og-image.webp
    │   ├── robots.txt
    │   ├── sitemap.xml
    │   └── sw-cleanup.js
    ├── scripts
    │   ├── add-lazy-loading.mjs
    │   ├── check-env.ci.mjs
    │   ├── cloudinary-runtime-audit.mjs
    │   ├── full-runtime-audit.mjs
    │   ├── postbuild.mjs
    │   ├── report-chunk-sizes.mjs
    │   └── split-checkout.mjs
    ├── src
    │   ├── admin
    │   │   ├── components
    │   │   │   ├── products
    │   │   │   │   └── wizard
    │   │   │   │   │   ├── ProductInfoStep.jsx
    │   │   │   │   │   ├── ProductMediaStep.jsx
    │   │   │   │   │   ├── ProductPricingStep.jsx
    │   │   │   │   │   ├── ProductReviewStep.jsx
    │   │   │   │   │   ├── ProductSeoStep.jsx
    │   │   │   │   │   └── ProductVariantsStep.jsx
    │   │   │   ├── AdminCustomOrderConfig.jsx
    │   │   │   ├── AdminErrorBoundary.jsx
    │   │   │   ├── AdminSidebar.jsx
    │   │   │   ├── AdminTopBar.jsx
    │   │   │   ├── AdminUIKit.jsx
    │   │   │   ├── CategorySelector.jsx
    │   │   │   ├── ConfirmDialog.jsx
    │   │   │   ├── DraftConflictViewer.jsx
    │   │   │   ├── DraftRestoreModal.jsx
    │   │   │   ├── DraftStatusIndicator.jsx
    │   │   │   ├── GlobalSearchPalette.jsx
    │   │   │   ├── ImageUpload.jsx
    │   │   │   ├── OccasionEditor.jsx
    │   │   │   ├── ProductSelector.jsx
    │   │   │   ├── UnsavedChangesGuard.jsx
    │   │   │   └── VideoUpload.jsx
    │   │   ├── context
    │   │   │   ├── AdminContext.jsx
    │   │   │   └── DraftProvider.jsx
    │   │   ├── data
    │   │   │   ├── adminData.js
    │   │   │   └── websiteContentData.js
    │   │   ├── hooks
    │   │   │   ├── useAdminCMS.js
    │   │   │   ├── useAdminOrders.js
    │   │   │   ├── useAdminProducts.js
    │   │   │   ├── useAdminSecurity.js
    │   │   │   └── useDraft.js
    │   │   ├── layouts
    │   │   │   └── AdminLayout.jsx
    │   │   ├── pages
    │   │   │   ├── AdminAddCategory.jsx
    │   │   │   ├── AdminAddEvent.jsx
    │   │   │   ├── AdminAddGalleryItem.jsx
    │   │   │   ├── AdminAddProduct.jsx
    │   │   │   ├── AdminAddShowcase.jsx
    │   │   │   ├── AdminAnalytics.jsx
    │   │   │   ├── AdminBookingDetail.jsx
    │   │   │   ├── AdminCampaignCreate.jsx
    │   │   │   ├── AdminCampaigns.jsx
    │   │   │   ├── AdminCategories.jsx
    │   │   │   ├── AdminConfig.jsx
    │   │   │   ├── AdminContent.jsx
    │   │   │   ├── AdminCoupons.jsx
    │   │   │   ├── AdminCreateCoupon.jsx
    │   │   │   ├── AdminCustomerProfile.jsx
    │   │   │   ├── AdminCustomers.jsx
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── AdminDrafts.jsx
    │   │   │   ├── AdminEvents.jsx
    │   │   │   ├── AdminGallery.jsx
    │   │   │   ├── AdminInquiries.jsx
    │   │   │   ├── AdminInventory.jsx
    │   │   │   ├── AdminLayouts.jsx
    │   │   │   ├── AdminNotifications.jsx
    │   │   │   ├── AdminOrderDetail.jsx
    │   │   │   ├── AdminOrders.jsx
    │   │   │   ├── AdminPayments.jsx
    │   │   │   ├── AdminPolicies.jsx
    │   │   │   ├── AdminPolicyEditor.jsx
    │   │   │   ├── AdminProducts.jsx
    │   │   │   ├── AdminRecommendationAnalytics.jsx
    │   │   │   ├── AdminRentalCalendar.jsx
    │   │   │   ├── AdminRentalOrders.jsx
    │   │   │   ├── AdminRentalPolicies.jsx
    │   │   │   ├── AdminReviews.jsx
    │   │   │   ├── AdminServiceAreas.jsx
    │   │   │   ├── AdminSettings.jsx
    │   │   │   ├── AdminSystemUsers.jsx
    │   │   │   ├── AdminTeam.jsx
    │   │   │   ├── AdminTemplateCreate.jsx
    │   │   │   └── AdminVisualSearch.jsx
    │   │   └── services
    │   │   │   └── draftService.js
    │   ├── animations
    │   │   └── variants.js
    │   ├── assets
    │   │   └── cloud_image_mappings.json
    │   ├── checkout
    │   │   ├── hooks
    │   │   │   ├── useCheckoutRentals.js
    │   │   │   ├── useCheckoutShipping.js
    │   │   │   └── useCheckoutTotals.js
    │   │   ├── CheckoutAddressStep.jsx
    │   │   ├── checkoutConstants.js
    │   │   ├── CheckoutCustomizationStep.jsx
    │   │   ├── CheckoutOrderSummaryStep.jsx
    │   │   ├── CheckoutPaymentStep.jsx
    │   │   ├── CheckoutProvider.jsx
    │   │   ├── CheckoutRecommendations.jsx
    │   │   ├── CheckoutRentalDurationStep.jsx
    │   │   ├── CheckoutSidebar.jsx
    │   │   └── CheckoutVerificationStep.jsx
    │   ├── components
    │   │   ├── admin
    │   │   ├── auth
    │   │   │   ├── AdminInviteModal.jsx
    │   │   │   ├── AuthGate.jsx
    │   │   │   ├── AuthModal.jsx
    │   │   │   └── ProtectedRoute.jsx
    │   │   ├── blog
    │   │   │   └── BlogCard.jsx
    │   │   ├── cart
    │   │   │   ├── CartItemRow.jsx
    │   │   │   └── CartView.jsx
    │   │   ├── dashboard
    │   │   │   ├── AddressCard.jsx
    │   │   │   ├── AddressModal.jsx
    │   │   │   ├── DashboardHeader.jsx
    │   │   │   ├── OrderCard.jsx
    │   │   │   ├── OrderDetail.jsx
    │   │   │   ├── OrdersTab.jsx
    │   │   │   ├── ProfileTab.jsx
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── StatCards.jsx
    │   │   ├── gallery
    │   │   │   ├── GalleryCard.jsx
    │   │   │   ├── GallerySlideshow.jsx
    │   │   │   └── VirtualizedMasonry.jsx
    │   │   ├── homepage
    │   │   │   └── HomeSectionState.jsx
    │   │   ├── layout
    │   │   │   ├── BottomNav.jsx
    │   │   │   ├── CartDrawer.jsx
    │   │   │   ├── CheckoutNavbar.jsx
    │   │   │   ├── ConsentPopup.jsx
    │   │   │   ├── DynamicSectionRenderer.jsx
    │   │   │   ├── Footer.jsx
    │   │   │   ├── index.js
    │   │   │   ├── PolicySidebar.jsx
    │   │   │   ├── SectionWrapper.jsx
    │   │   │   ├── StackedSectionWrapper.jsx
    │   │   │   └── TopNavbar.jsx
    │   │   ├── loyalty
    │   │   │   └── LoyaltyPanel.jsx
    │   │   ├── reviews
    │   │   │   ├── PostReviewModal.jsx
    │   │   │   └── ReviewLightbox.jsx
    │   │   ├── search
    │   │   │   ├── IntelligentSearchOverlay.jsx
    │   │   │   └── VisualSearchOverlay.jsx
    │   │   ├── sections
    │   │   │   ├── BestsellerSection.jsx
    │   │   │   ├── DynamicHomepageFeed.jsx
    │   │   │   ├── GallerySection.jsx
    │   │   │   ├── HeroSection.jsx
    │   │   │   ├── NavigationHub.jsx
    │   │   │   ├── PersonalizedFeed.jsx
    │   │   │   ├── ProductReviews.jsx
    │   │   │   ├── RecommendationSystem.jsx
    │   │   │   ├── SeasonalHighlights.jsx
    │   │   │   ├── StorySection.jsx
    │   │   │   ├── TrendingSection.jsx
    │   │   │   └── VerifiedReviews.jsx
    │   │   ├── seo
    │   │   │   ├── FAQAccordion.jsx
    │   │   │   └── SEO.jsx
    │   │   ├── shared
    │   │   │   ├── CarouselWrapper.jsx
    │   │   │   ├── ProductCard.jsx
    │   │   │   └── SectionHeader.jsx
    │   │   ├── ui
    │   │   │   ├── __tests__
    │   │   │   │   ├── a11y.smoke.test.jsx
    │   │   │   │   ├── Button.test.jsx
    │   │   │   │   ├── FeedbackStates.test.jsx
    │   │   │   │   ├── ProductCard.test.jsx
    │   │   │   │   └── SearchBar.test.jsx
    │   │   │   ├── skeletons
    │   │   │   │   ├── CartCheckoutSkeletons.jsx
    │   │   │   │   ├── CommonSkeletons.jsx
    │   │   │   │   ├── EventSkeletons.jsx
    │   │   │   │   ├── PageSkeletons.jsx
    │   │   │   │   └── ProductSkeletons.jsx
    │   │   │   ├── Button.jsx
    │   │   │   ├── CategoryTabs.jsx
    │   │   │   ├── CheckoutSteps.jsx
    │   │   │   ├── CloudflareVerification.jsx
    │   │   │   ├── CloudinaryImage.jsx
    │   │   │   ├── CustomDropdown.jsx
    │   │   │   ├── CustomizationFields.jsx
    │   │   │   ├── DynamicCustomOrderWizard.jsx
    │   │   │   ├── ErrorBoundary.jsx
    │   │   │   ├── EventFilterPanel.jsx
    │   │   │   ├── EventShowcaseFilterPanel.jsx
    │   │   │   ├── FeedbackStates.jsx
    │   │   │   ├── FilterPanel.jsx
    │   │   │   ├── FormField.jsx
    │   │   │   ├── GlobalTracker.jsx
    │   │   │   ├── Icon.jsx
    │   │   │   ├── index.js
    │   │   │   ├── InvoiceTemplate.jsx
    │   │   │   ├── LazyImage.jsx
    │   │   │   ├── LazySection.jsx
    │   │   │   ├── LocationSelectorModal.jsx
    │   │   │   ├── MandalaArtDecor.jsx
    │   │   │   ├── MandalaElement.jsx
    │   │   │   ├── NavigationOrchestrator.jsx
    │   │   │   ├── NoInternetOverlay.jsx
    │   │   │   ├── OptimizedImage.jsx
    │   │   │   ├── PageLoader.jsx
    │   │   │   ├── Pagination.jsx
    │   │   │   ├── PremiumFilterOverlay.jsx
    │   │   │   ├── PremiumRecommendationCard.jsx
    │   │   │   ├── ProductCard.jsx
    │   │   │   ├── ProductGallery.jsx
    │   │   │   ├── ProductInfo.jsx
    │   │   │   ├── PromoBanner.jsx
    │   │   │   ├── PwaUpdatePrompt.jsx
    │   │   │   ├── QuickViewModal.jsx
    │   │   │   ├── RecommendationCarousel.jsx
    │   │   │   ├── RetryBlock.jsx
    │   │   │   ├── RouteSkeleton.jsx
    │   │   │   ├── ScrollManager.jsx
    │   │   │   ├── ScrollToTopButton.jsx
    │   │   │   ├── SearchBar.jsx
    │   │   │   ├── ShareButton.jsx
    │   │   │   ├── ShowcaseCard.jsx
    │   │   │   ├── SiriLogo.jsx
    │   │   │   ├── Skeleton.jsx
    │   │   │   ├── SkeletonBase.jsx
    │   │   │   ├── SlowConnectionBanner.jsx
    │   │   │   ├── SplashScreen.jsx
    │   │   │   ├── StateRenderer.jsx
    │   │   │   ├── StickyMobileATC.jsx
    │   │   │   └── WhatsAppWidget.jsx
    │   │   └── wishlist
    │   │   │   └── WishlistView.jsx
    │   ├── config
    │   │   ├── apiConfig.js
    │   │   └── constants.js
    │   ├── constants
    │   │   ├── assets.js
    │   │   ├── brandEnv.js
    │   │   ├── design-tokens.js
    │   │   ├── emptyWebsiteContent.js
    │   │   ├── mandalaAssets.js
    │   │   └── placeholderImages.js
    │   ├── content
    │   │   ├── blogs.json
    │   │   └── locations.json
    │   ├── context
    │   │   ├── AuthContext.jsx
    │   │   ├── AuthProvider.jsx
    │   │   ├── CartContext.jsx
    │   │   ├── CartProvider.jsx
    │   │   ├── ConfigContext.jsx
    │   │   ├── DashboardContext.jsx
    │   │   ├── NetworkContext.jsx
    │   │   ├── NetworkProvider.jsx
    │   │   ├── UserSocketProvider.jsx
    │   │   ├── WishlistContext.jsx
    │   │   └── WishlistProvider.jsx
    │   ├── hooks
    │   │   ├── __tests__
    │   │   │   ├── useMediaQuery.test.js
    │   │   │   └── useWindowHeight.test.js
    │   │   ├── useApi.js
    │   │   ├── useCartQueries.js
    │   │   ├── useDashboardData.js
    │   │   ├── useInfiniteGallery.js
    │   │   ├── useMediaQuery.js
    │   │   ├── usePersonalizedSections.js
    │   │   ├── useProductQueries.js
    │   │   ├── useRazorpay.jsx
    │   │   ├── useRecommendationQueries.js
    │   │   ├── useRecommendationTracker.js
    │   │   ├── useScrollDirection.js
    │   │   ├── useSearchOverlay.js
    │   │   ├── useSearchQueries.js
    │   │   ├── useUserQueries.js
    │   │   ├── useVisualSearch.js
    │   │   ├── useWebsiteContent.js
    │   │   └── useWindowHeight.js
    │   ├── layouts
    │   │   └── MainLayout.jsx
    │   ├── pages
    │   │   ├── __tests__
    │   │   │   └── ProductListing.test.jsx
    │   │   ├── Dashboard
    │   │   │   ├── AddressesSection.jsx
    │   │   │   ├── DashboardLayout.jsx
    │   │   │   ├── EventsSection.jsx
    │   │   │   ├── OrdersSection.jsx
    │   │   │   ├── ProfileSection.jsx
    │   │   │   ├── RentalsSection.jsx
    │   │   │   ├── SettingsSection.jsx
    │   │   │   └── WalletSection.jsx
    │   │   ├── eventDetail
    │   │   │   ├── EventBookingCard.jsx
    │   │   │   ├── EventCustomizerDrawer.jsx
    │   │   │   ├── EventGallery.jsx
    │   │   │   └── useEventBookingForm.js
    │   │   ├── Home
    │   │   │   ├── sections
    │   │   │   │   ├── BestSellers.jsx
    │   │   │   │   ├── CategoryGrid.jsx
    │   │   │   │   ├── GalleryInspiration.jsx
    │   │   │   │   ├── HeroCarousel.jsx
    │   │   │   │   ├── PromoBanner.jsx
    │   │   │   │   ├── RecommendedGrid.jsx
    │   │   │   │   ├── ShopByOccasion.jsx
    │   │   │   │   └── TrendingProducts.jsx
    │   │   │   ├── home.css
    │   │   │   └── Home.jsx
    │   │   ├── About.jsx
    │   │   ├── AcceptInvite.jsx
    │   │   ├── BlogListing.jsx
    │   │   ├── BlogPost.jsx
    │   │   ├── Cart.jsx
    │   │   ├── Checkout.jsx
    │   │   ├── CollectionDetail.jsx
    │   │   ├── Contact.jsx
    │   │   ├── Coupons.jsx
    │   │   ├── CustomOrders.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── EventBookingSuccess.jsx
    │   │   ├── EventBookingWizard.jsx
    │   │   ├── EventCollections.jsx
    │   │   ├── EventCustomerDashboard.jsx
    │   │   ├── EventDetail.jsx
    │   │   ├── EventShowcases.jsx
    │   │   ├── Gallery.jsx
    │   │   ├── GalleryDetail.jsx
    │   │   ├── GPSMapLazy.jsx
    │   │   ├── LocationLanding.jsx
    │   │   ├── MyCustomOrders.jsx
    │   │   ├── NotFound.jsx
    │   │   ├── OrderSuccess.jsx
    │   │   ├── OrderTrackingPublic.jsx
    │   │   ├── Privacy.jsx
    │   │   ├── ProductAllReviews.jsx
    │   │   ├── ProductDetails.jsx
    │   │   ├── ProductListing.jsx
    │   │   ├── ProductReviewImages.jsx
    │   │   ├── Returns.jsx
    │   │   ├── Shipping.jsx
    │   │   ├── Terms.jsx
    │   │   └── Wishlist.jsx
    │   ├── routes
    │   ├── services
    │   │   ├── api
    │   │   │   ├── _shared.js
    │   │   │   ├── adminInviteService.js
    │   │   │   ├── analyticsService.js
    │   │   │   ├── authService.js
    │   │   │   ├── bookingService.js
    │   │   │   ├── cmsService.js
    │   │   │   ├── couponService.js
    │   │   │   ├── customOrderService.js
    │   │   │   ├── eventService.js
    │   │   │   ├── galleryService.js
    │   │   │   ├── homepageService.js
    │   │   │   ├── inquiryService.js
    │   │   │   ├── loyaltyService.js
    │   │   │   ├── notificationService.js
    │   │   │   ├── orderService.js
    │   │   │   ├── policyService.js
    │   │   │   ├── productService.js
    │   │   │   ├── reviewService.js
    │   │   │   ├── showcaseService.js
    │   │   │   ├── uploadService.js
    │   │   │   └── userService.js
    │   │   ├── api.js
    │   │   ├── domainServices.js
    │   │   ├── recommendationService.js
    │   │   ├── rentalService.js
    │   │   ├── searchService.js
    │   │   └── visualSearchService.js
    │   ├── styles
    │   │   ├── admin.css
    │   │   ├── globals.css
    │   │   └── visual-search.css
    │   ├── test
    │   │   └── setup.js
    │   ├── utils
    │   │   ├── analytics.js
    │   │   ├── apiCache.js
    │   │   ├── apiErrors.js
    │   │   ├── apiUrl.js
    │   │   ├── audioUtils.js
    │   │   ├── authSessionCache.js
    │   │   ├── authStorage.js
    │   │   ├── bootstrap.js
    │   │   ├── cmsMediaGovernance.js
    │   │   ├── diagnostics.js
    │   │   ├── errorHelpers.js
    │   │   ├── imageCompressor.js
    │   │   ├── imageUtils.js
    │   │   ├── lazyWithRetry.js
    │   │   ├── logger.js
    │   │   ├── observability.js
    │   │   ├── performanceMonitor.js
    │   │   ├── persistentStorage.js
    │   │   ├── prefetchManager.js
    │   │   ├── prerender.js
    │   │   ├── profilerLogger.js
    │   │   ├── queryPersister.js
    │   │   ├── sanitize.js
    │   │   └── storage.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── vite-env.d.ts
    ├── .dockerignore
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── .npmrc
    ├── Dockerfile
    ├── errors.txt
    ├── eslint-results.json
    ├── eslint.config.js
    ├── index.html
    ├── lint-errors.log
    ├── nginx.conf
    ├── package-lock.json
    ├── package.json
    ├── SECURITY.md
    ├── vercel.json
    └── vite.config.js
├── ops-archive
    ├── add_missing_categories.js
    ├── check_lock.js
    ├── clear-wishlist-duplicates.js
    ├── create-test-user.js
    ├── drop_indexes.js
    ├── invalidate_cache.js
    ├── migrate_legacy_media.ts
    ├── migrate-reviews.js
    ├── prod-maintenance.sh
    ├── restore_categories.js
    ├── restoreAdmin.js
    ├── rotate-secrets.sh
    ├── test_admin_auth.js
    └── test_groq.js
├── scripts
    ├── build-vercel.js
    ├── check-no-console.mjs
    ├── decomposeAdmin.js
    ├── fix-unused-vars.js
    ├── fix.js
    ├── generateTree.js
    ├── imports.js
    ├── loc.js
    ├── optimize-assets.mjs
    ├── script.js
    └── splitSkeleton.js
├── .gitignore
├── .lintstagedrc.json
├── .npmrc
├── .prettierrc.json
├── codebase_tree.txt
├── docker-compose.yml
├── nginx.example.conf
├── package-lock.json
├── package.json
└── README.md
```
