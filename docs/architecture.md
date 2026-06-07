# Backend Architecture Overview

## Routes
### adminInviteRoutes.ts
- post('/'
- get('/pending'
- get('/history'
- delete('/:id/revoke'
- get('/my-pending'
- post('/respond'
### adminSystemRoutes.ts
- post('/auth/login'
- post('/auth/logout'
- post('/auth/forgot-password'
- post('/auth/reset-password'
- post('/auth/2fa/setup'
- post('/auth/2fa/enable'
- post('/auth/verify-2fa'
- get('/system/users'
- post('/system/users'
- put('/system/users/:id/role'
- delete('/system/users/:id'
### analyticsRoutes.ts
- get('/dashboard'
- get('/audit-logs'
- post('/audit-logs'
- delete('/audit-logs'
- get('/payments/reconciliation'
### appConfigRoutes.ts
- get('/public'
- get('/'
- post('/'
### authRoutes.ts
- post('/send-otp'
- post('/verify-otp'
- post('/refresh'
- post('/logout'
- post('/logout-all'
- get('/profile'
- get('/2fa/status'
- post('/2fa/setup'
- post('/2fa/enable'
- post('/2fa/disable'
- post('/2fa/verify-login'
### categoryRoutes.ts
- get('/active'
- get('/'
- post('/'
- put('/:id'
### cmsRoutes.ts
- get('/'
- get('/:key'
- put('/:key'
- post('/publish-all'
- post('/ai-generate'
### couponRoutes.ts
- get('/validate/:code'
- post('/apply'
- get('/'
- post('/'
- put('/:id'
- delete('/:id'
### customOrderRoutes.ts
- get('/config'
- put('/config'
- post('/'
- get('/my-orders'
- get('/:id'
- post('/:id/messages'
- post('/:id/quotation/respond'
- get('/'
- patch('/:id/status'
- patch('/:id/priority'
- patch('/:id/notes'
- patch('/:id/quotation'
- patch('/:id/archive'
### eventBookingRoutes.ts
- get('/admin/all'
- patch('/:id/status'
- patch('/:id/quotation'
- patch('/:id/logistics'
- patch('/:id/notes'
- post('/checkout/initialize'
- post('/checkout/verify'
- post('/'
- get('/my-bookings'
- get('/:id'
- post('/:id/respond-quote'
- post('/:id/payment'
- post('/:id/chat'
### eventRoutes.ts
- get('/'
- get('/:id'
- post('/'
- put('/:id'
### galleryRoutes.ts
- get('/'
- get('/categories'
- get('/:id'
- post('/:id/like'
- post('/'
- put('/:id'
- delete('/:id'
### homepageRoutes.ts
- get('/'
### inquiryRoutes.ts
- post('/'
- get('/'
- patch('/:id/status'
### loyaltyRoutes.ts
- get('/tiers'
- get('/dashboard'
- post('/apply-referral'
- get('/admin/reviews'
- post('/admin/moderate-review'
### mediaRoutes.ts
- get("/optimize"
### notificationRoutes.ts
- post('/consent'
- get('/consent/:token'
- get('/unsubscribe'
- get('/track/open/:token'
- get('/track/click/:token'
- post('/admin/campaigns'
- get('/admin/campaigns'
- post('/admin/campaigns/:id/send'
- get('/admin/templates'
- post('/admin/templates'
- patch('/admin/templates/:id'
- get('/admin/analytics'
- get('/admin/alerts'
- patch('/admin/alerts/mark-all-read'
- patch('/admin/alerts/:id/read'
- delete('/admin/alerts/:id'
### pageLayoutRoutes.ts
- get('/path'
- get('/'
- post('/'
### policyRoutes.ts
- get('/slug/:slug'
- get('/'
- get('/:id'
- post('/'
- put('/:id'
- delete('/:id'
### productRoutes.ts
- get('/'
- get('/categories'
- get('/:id'
- post('/'
- put('/:id'
- delete('/:id'
- patch('/:id/toggle-featured'
- post('/ai-autofill'
### recommendationAnalyticsRoutes.ts
- get('/overview'
- get('/ctr'
- get('/trending-history'
- get('/user-interests'
- get('/seasonal-demand'
- get('/conversion-impact'
### recommendationRoutes.ts
- get('/feed'
- get('/similar/:targetType/:targetId'
- get('/trending'
- get('/seasonal'
- get('/complete-setup/:targetId'
- get('/also-viewed/:targetId'
- get('/for-you'
- get('/homepage-sections'
### reviewRoutes.ts
- get('/public'
- get('/product/:productId'
- post('/:id/helpful'
- post('/'
- get('/can-review/:productId'
- get('/'
- patch('/:id/status'
- delete('/:id'
### searchRoutes.ts
- get('/autocomplete'
- get('/results'
- get('/trending'
- get('/related'
### showcaseRoutes.ts
- get('/'
- get('/:id'
- post('/'
- put('/:id'
- delete('/:id'
### trackingRoutes.ts
- post('/event'
- post('/batch'
- post('/session'
### uploadRoutes.ts
- post('/inspirations'
- post('/products'
- post('/gallery'
- post('/cms'
- post('/'
### userRoutes.ts
- get('/categories'
- get('/profile'
- patch('/profile'
- get('/addresses'
- post('/addresses'
- patch('/addresses/:addressId'
- delete('/addresses/:addressId'
- patch('/addresses/:addressId/default'
- get('/wishlist'
- post('/wishlist/toggle'
- get('/cart'
- post('/cart'
- put('/cart'
- delete('/cart/:productId'
- get('/recently-viewed'
- post('/recently-viewed'
- patch('/preferences'
- post('/avatar'
- get('/me/export'
- delete('/me'
- get('/'
- get('/team'
- post('/team/invite'
- delete('/team/invite/:id'
- get('/team/invite/details'
- post('/team/invite/respond'
- get('/:id'
- patch('/:id/role'

## Models
- Address (from Address.ts)
- AdminAuditLog (from AdminAuditLog.ts)
- AdminInvite (from AdminInvite.ts)
- AdminNotification (from AdminNotification.ts)
- AppConfig (from AppConfig.ts)
- BookingMessage (from BookingMessage.ts)
- Category (from Category.ts)
- ConsentPreference (from ConsentPreference.ts)
- ContentSection (from ContentSection.ts)
- Coupon (from Coupon.ts)
- CustomOrder (from CustomOrder.ts)
- EmailCampaign (from EmailCampaign.ts)
- EmailTemplate (from EmailTemplate.ts)
- Event (from Event.ts)
- EventBooking (from EventBooking.ts)
- FailedEmailJob (from FailedEmailJob.ts)
- FailedLoginAttempt (from FailedLoginAttempt.ts)
- Gallery (from Gallery.ts)
- Inquiry (from Inquiry.ts)
- InventoryLog (from InventoryLog.ts)
- NotificationLog (from NotificationLog.ts)
- Order (from Order.ts)
- OtpRequestLog (from OtpRequestLog.ts)
- OtpVerification (from OtpVerification.ts)
- PageLayout (from PageLayout.ts)
- PasswordResetToken (from PasswordResetToken.ts)
- PaymentAudit (from PaymentAudit.ts)
- Policy (from Policy.ts)
- Product (from Product.ts)
- RefreshToken (from RefreshToken.ts)
- Review (from Review.ts)
- ShowcaseCollection (from ShowcaseCollection.ts)
- TeamInvite (from TeamInvite.ts)
- UsedRefreshToken (from UsedRefreshToken.ts)
- RefreshToken (from User.ts)
- UserInteraction (from UserInteraction.ts)
- WalletTransaction (from WalletTransaction.ts)
- WebsiteContent (from WebsiteContent.ts)
