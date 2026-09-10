import React from 'react';
import { AdminToggle } from '../AdminUIKit';

const FormGroup = ({ label, description, children }) => (
  <div className="space-y-1.5">
    <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
      {label}
    </label>
    {description && (
      <p className="text-[11.5px] text-[var(--admin-text-secondary)] -mt-0.5 mb-1.5">
        {description}
      </p>
    )}
    {children}
  </div>
);

const Input = ({ type = 'text', name, value, onChange, ...props }) => (
  <input
    type={type}
    name={name}
    value={value === undefined || value === null ? '' : value}
    onChange={onChange}
    className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
    {...props}
  />
);

const Checkbox = ({ label, name, checked, onChange, description }) => (
  <div className="flex items-start gap-3 p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-[4px] transition-all">
    <AdminToggle
      checked={!!checked}
      onChange={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
      size="sm"
    />
    <div className="pt-0.5 flex-1 min-w-0">
      <label className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight cursor-pointer select-none block">
        {label}
      </label>
      {description && (
        <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-1 leading-normal">
          {description}
        </p>
      )}
    </div>
  </div>
);

export const SaveButton = ({ saving, label = 'Save Settings' }) => (
  <button
    type="submit"
    disabled={saving}
    className="h-9 px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
  >
    <span className="material-symbols-outlined text-[16px]">save</span>
    <span>{saving ? 'Saving...' : label}</span>
  </button>
);

export const GeneralSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Store Name">
        <Input name="storeName" value={formData.storeName} onChange={handleChange} required />
      </FormGroup>
      <FormGroup label="Tagline">
        <Input
          name="tagline"
          value={formData.tagline}
          onChange={handleChange}
          placeholder="e.g. Handcrafted Heritage & Artistry"
        />
      </FormGroup>
      <FormGroup label="Support Email">
        <Input
          type="email"
          name="supportEmail"
          value={formData.supportEmail}
          onChange={handleChange}
          placeholder="e.g. support@siriartsandcrafts.com"
        />
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
      <SaveButton saving={saving} />
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
      <FormGroup label="Express Delivery Charge (₹)">
        <Input
          type="number"
          name="expressDeliveryCharge"
          value={formData.expressDeliveryCharge}
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
      <FormGroup label="Origin Pincode (Warehouse Dispatch)">
        <Input
          name="originPincode"
          value={formData.originPincode}
          onChange={handleChange}
          placeholder="e.g. 523001"
        />
      </FormGroup>
      <FormGroup label="Default Courier Partner">
        <Input
          name="defaultCourierPartner"
          value={formData.defaultCourierPartner}
          onChange={handleChange}
          placeholder="e.g. Delhivery Logistics"
        />
      </FormGroup>
      <div className="md:col-span-2 space-y-3">
        <Checkbox
          name="enableFreeShipping"
          checked={formData.enableFreeShipping}
          onChange={handleChange}
          label="Enable Free Shipping Over Threshold"
        />
        <Checkbox
          name="enableExpressDelivery"
          checked={formData.enableExpressDelivery}
          onChange={handleChange}
          label="Enable Express Delivery Option"
        />
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
                  value={tier.name || ''}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, name: e.target.value } : t,
                    );
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Min Spend (₹)">
                <input
                  type="number"
                  value={tier.minSpend === undefined ? '' : tier.minSpend}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, minSpend: Number(e.target.value) } : t,
                    );
                    handleCustomChange('tiers', newTiers);
                  }}
                  className="admin-input"
                />
              </FormGroup>
              <FormGroup label="Cashback Rate (e.g. 0.05 for 5%)">
                <input
                  type="number"
                  step="0.01"
                  value={tier.cashbackRate === undefined ? '' : tier.cashbackRate}
                  onChange={(e) => {
                    const newTiers = formData.tiers.map((t, i) =>
                      i === index ? { ...t, cashbackRate: Number(e.target.value) } : t,
                    );
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
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
            value={formData.address || ''}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
      <FormGroup label="City">
        <Input
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="e.g. Ongole"
        />
      </FormGroup>
      <FormGroup label="State">
        <Input
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="e.g. Andhra Pradesh"
        />
      </FormGroup>
      <FormGroup label="Postal Code">
        <Input
          name="postalCode"
          value={formData.postalCode}
          onChange={handleChange}
          placeholder="e.g. 523001"
        />
      </FormGroup>
      <FormGroup label="Country">
        <Input
          name="country"
          value={formData.country}
          onChange={handleChange}
          placeholder="e.g. India"
        />
      </FormGroup>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);

export const LegalSettingsPanel = ({ formData, handleChange, handleSave, saving }) => (
  <form onSubmit={handleSave} className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormGroup label="Brand / Display Name">
        <Input name="companyName" value={formData.companyName} onChange={handleChange} />
      </FormGroup>
      <FormGroup label="Registered Legal Company Name">
        <Input
          name="legalCompanyName"
          value={formData.legalCompanyName}
          onChange={handleChange}
          placeholder="e.g. Siri Arts and Crafts Private Limited"
        />
      </FormGroup>
      <FormGroup label="CIN (Corporate Identification Number)">
        <Input name="cin" value={formData.cin} onChange={handleChange} />
      </FormGroup>
      <div className="md:col-span-2">
        <FormGroup label="Registered Address">
          <textarea
            name="registeredAddress"
            rows={3}
            value={formData.registeredAddress || ''}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
      <SaveButton saving={saving} />
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
            value={formData.seoDescription || ''}
            onChange={handleChange}
            className="admin-textarea"
          />
        </FormGroup>
      </div>
    </div>
    <div className="flex justify-end border-t border-[var(--admin-border-subtle)] pt-6">
      <SaveButton saving={saving} />
    </div>
  </form>
);
