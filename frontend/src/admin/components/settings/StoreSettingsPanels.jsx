import React from 'react';
import { AdminToggle } from '../AdminUIKit';

const FormGroup = ({ label, description, children }) => (
  <div className="space-y-2">
    <label className="admin-label">{label}</label>
    {description && (
      <p className="text-[12px] text-[var(--admin-text-tertiary)] -mt-1 mb-2">{description}</p>
    )}
    {children}
  </div>
);

const Input = ({ type = 'text', name, value, onChange, ...props }) => (
  <input
    type={type}
    name={name}
    value={value === undefined ? '' : value}
    onChange={onChange}
    className="admin-input"
    {...props}
  />
);

const Checkbox = ({ label, name, checked, onChange, description }) => (
  <div className="flex items-start gap-3 p-4 admin-card-interactive rounded-[var(--admin-radius-lg)]">
    <AdminToggle
      checked={!!checked}
      onChange={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
      size="sm"
    />
    <div className="pt-0.5">
      <label className="text-[14px] font-medium text-[var(--admin-text-primary)] leading-none">
        {label}
      </label>
      {description && (
        <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-1">{description}</p>
      )}
    </div>
  </div>
);

export const GeneralSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Store Name">
        <Input name="storeName" value={formData.storeName} onChange={handleChange} required />
      </FormGroup>
      <FormGroup label="Store Enabled">
        <Checkbox
          name="storeEnabled"
          checked={formData.storeEnabled}
          onChange={handleChange}
          label="Enable Storefront"
        />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Announcement Text">
          <Input
            name="announcementText"
            value={formData.announcementText}
            onChange={handleChange}
          />
        </FormGroup>
      </div>
      <div className="md:col-span-2">
        <FormGroup label="Announcement Link">
          <Input
            name="announcementLink"
            value={formData.announcementLink}
            onChange={handleChange}
          />
        </FormGroup>
      </div>
      <div className="md:col-span-2">
        <FormGroup label="Maintenance Mode">
          <Checkbox
            name="maintenanceMode"
            checked={formData.maintenanceMode}
            onChange={handleChange}
            label="Enable Maintenance Mode"
            description="Only admins can access the store."
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const ShippingSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Base Delivery Charge (₹)">
        <Input
          type="number"
          name="deliveryCharge"
          value={formData.deliveryCharge}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Free Shipping Threshold (₹)">
        <Input
          type="number"
          name="freeShippingThreshold"
          value={formData.freeShippingThreshold}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Estimated Delivery Days">
        <Input
          name="estimatedDeliveryDays"
          value={formData.estimatedDeliveryDays}
          onChange={handleChange}
          placeholder="e.g. 5-7"
        />
      </FormGroup>
      <div className="md:col-span-2">
        <Checkbox
          name="enableFreeShipping"
          checked={formData.enableFreeShipping}
          onChange={handleChange}
          label="Enable Free Shipping Over Threshold"
        />
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const PaymentSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2 space-y-3">
        <Checkbox
          name="enableRazorpay"
          checked={formData.enableRazorpay}
          onChange={handleChange}
          label="Enable Razorpay Gateway"
        />
        <Checkbox
          name="enableCOD"
          checked={formData.enableCOD}
          onChange={handleChange}
          label="Enable Cash on Delivery"
        />
      </div>
      {formData.enableCOD && (
        <>
          <FormGroup label="COD Handling Fee (₹)">
            <Input type="number" name="codFee" value={formData.codFee} onChange={handleChange} />
          </FormGroup>
          <FormGroup label="Minimum Order for COD (₹)">
            <Input
              type="number"
              name="codMinOrder"
              value={formData.codMinOrder}
              onChange={handleChange}
            />
          </FormGroup>
          <FormGroup label="Maximum Order for COD (₹)">
            <Input
              type="number"
              name="codMaxOrder"
              value={formData.codMaxOrder}
              onChange={handleChange}
            />
          </FormGroup>
        </>
      )}
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const ReturnSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Checkbox
        name="enableReturns"
        checked={formData.enableReturns}
        onChange={handleChange}
        label="Enable Returns"
      />
      <Checkbox
        name="enableExchanges"
        checked={formData.enableExchanges}
        onChange={handleChange}
        label="Enable Exchanges"
      />

      <FormGroup label="Return Window (Days)">
        <Input
          type="number"
          name="returnWindowDays"
          value={formData.returnWindowDays}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Exchange Window (Days)">
        <Input
          type="number"
          name="exchangeWindowDays"
          value={formData.exchangeWindowDays}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Return Processing Time">
        <Input
          name="returnProcessingDays"
          value={formData.returnProcessingDays}
          onChange={handleChange}
          placeholder="e.g. 3-5 business days"
        />
      </FormGroup>
      <FormGroup label="Refund Processing Timeline">
        <Input
          name="refundProcessingDays"
          value={formData.refundProcessingDays}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const LoyaltySettingsPanel = ({
  formData,
  handleChange,
  handleCustomChange,
  handleSave,
  saving,
}) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-1">Earnings</h4>
        <hr className="border-[var(--admin-border-subtle)] mb-4" />
      </div>
      <FormGroup label="Siri Coins per ₹1 Spent">
        <Input
          type="number"
          step="0.01"
          name="coinsPerRupee"
          value={formData.coinsPerRupee}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Welcome Bonus (Wallet Cash)">
        <Input
          type="number"
          name="welcomeBonus"
          value={formData.welcomeBonus}
          onChange={handleChange}
        />
      </FormGroup>

      <div className="md:col-span-2 mt-4">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-1">Referrals</h4>
        <hr className="border-[var(--admin-border-subtle)] mb-4" />
      </div>
      <FormGroup label="Bonus for Referrer (₹)">
        <Input
          type="number"
          name="referralBonusReferrer"
          value={formData.referralBonusReferrer}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Bonus for Referee (₹)">
        <Input
          type="number"
          name="referralBonusReferee"
          value={formData.referralBonusReferee}
          onChange={handleChange}
        />
      </FormGroup>

      <div className="md:col-span-2 mt-4">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-1">Review Rewards</h4>
        <hr className="border-[var(--admin-border-subtle)] mb-4" />
      </div>
      <FormGroup label="Text Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardText"
          value={formData.reviewRewardText}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Photo Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardPhoto"
          value={formData.reviewRewardPhoto}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Video Review Reward (₹)">
        <Input
          type="number"
          name="reviewRewardVideo"
          value={formData.reviewRewardVideo}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Review Siri Coins Bonus">
        <Input
          type="number"
          name="reviewCoinsBonus"
          value={formData.reviewCoinsBonus}
          onChange={handleChange}
        />
      </FormGroup>
    </div>

    {formData.tiers && (
      <div className="mt-8">
        <h4 className="font-bold text-[var(--admin-text-primary)] mb-4">Loyalty Tiers</h4>
        <div className="admin-card-inset p-4 space-y-4 rounded-[var(--admin-radius-lg)]">
          {formData.tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <FormGroup label="Tier Name">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => {
                    const newTiers = [...formData.tiers];
                    newTiers[index].name = e.target.value;
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Min Spend (₹)">
                <input
                  type="number"
                  value={tier.minSpend}
                  onChange={(e) => {
                    const newTiers = [...formData.tiers];
                    newTiers[index].minSpend = Number(e.target.value);
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Cashback Rate (e.g. 0.05 for 5%)">
                <input
                  type="number"
                  step="0.01"
                  value={tier.cashbackRate}
                  onChange={(e) => {
                    const newTiers = [...formData.tiers];
                    newTiers[index].cashbackRate = Number(e.target.value);
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const OrderSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Max Items Per Order">
        <Input
          type="number"
          name="maxItemsPerOrder"
          value={formData.maxItemsPerOrder}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Max Quantity Per Item">
        <Input
          type="number"
          name="maxQuantityPerItem"
          value={formData.maxQuantityPerItem}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Minimum Order Value (₹)">
        <Input
          type="number"
          name="minOrderValue"
          value={formData.minOrderValue}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Maximum Order Value (₹)">
        <Input
          type="number"
          name="maxOrderValue"
          value={formData.maxOrderValue}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Platform Fee (₹)">
        <Input
          type="number"
          name="platformFee"
          value={formData.platformFee}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const TaxSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2 space-y-3">
        <Checkbox
          name="gstEnabled"
          checked={formData.gstEnabled}
          onChange={handleChange}
          label="Enable GST Computation"
        />
        <Checkbox
          name="taxInclusive"
          checked={formData.taxInclusive}
          onChange={handleChange}
          label="Prices are Tax Inclusive"
        />
      </div>
      <FormGroup label="GST Number">
        <Input name="gstNumber" value={formData.gstNumber} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Base GST Rate (e.g. 0.18 for 18%)">
        <Input
          type="number"
          step="0.01"
          name="gstRate"
          value={formData.gstRate}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="CGST Rate (e.g. 0.09 for 9%)">
        <Input
          type="number"
          step="0.01"
          name="cgstRate"
          value={formData.cgstRate}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="SGST Rate (e.g. 0.09 for 9%)">
        <Input
          type="number"
          step="0.01"
          name="sgstRate"
          value={formData.sgstRate}
          onChange={handleChange}
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const ContactSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Email Address">
        <Input type="email" name="email" value={formData.email} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Phone Number">
        <Input name="phone" value={formData.phone} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="WhatsApp Number">
        <Input name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Support Hours">
        <Input name="supportHours" value={formData.supportHours} onChange={handleChange} />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Physical Address">
          <textarea
            name="address"
            rows={3}
            value={formData.address}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const LegalSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Registered Company Name">
        <Input name="companyName" value={formData.companyName} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="CIN (Corporate Identification Number)">
        <Input name="cin" value={formData.cin} onChange={handleChange} />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Registered Address">
          <textarea
            name="registeredAddress"
            rows={3}
            value={formData.registeredAddress}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const CancellationSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <Checkbox
          name="allowCustomerCancellation"
          checked={formData.allowCustomerCancellation || formData.allowCancellation}
          onChange={handleChange}
          label="Allow Customer Cancellation"
        />
      </div>
      {(formData.allowCustomerCancellation || formData.allowCancellation) && (
        <>
          <FormGroup label="Cancellation Window (Hours)">
            <Input
              type="number"
              name="cancellationWindowHours"
              value={formData.cancellationWindowHours}
              onChange={handleChange}
            />
          </FormGroup>
          <FormGroup label="Refund Timeline">
            <Input
              type="text"
              name="refundTimeline"
              value={formData.refundTimeline}
              onChange={handleChange}
            />
          </FormGroup>
        </>
      )}
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const NotificationSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2 space-y-3">
        <Checkbox
          name="emailEnabled"
          checked={formData.emailEnabled}
          onChange={handleChange}
          label="Enable Email Notifications"
        />
        <Checkbox
          name="smsEnabled"
          checked={formData.smsEnabled}
          onChange={handleChange}
          label="Enable SMS Notifications"
        />
        <Checkbox
          name="whatsappEnabled"
          checked={formData.whatsappEnabled}
          onChange={handleChange}
          label="Enable WhatsApp Notifications"
        />
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);

export const StorefrontSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <FormGroup label="SEO Title Default">
          <Input name="seoTitle" value={formData.seoTitle} onChange={handleChange} />
        </FormGroup>
      </div>
      <div className="md:col-span-2">
        <FormGroup label="SEO Description Default">
          <textarea
            name="seoDescription"
            rows={3}
            value={formData.seoDescription}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  </form>
);
