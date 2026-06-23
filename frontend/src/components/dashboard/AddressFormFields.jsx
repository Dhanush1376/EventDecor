import React from 'react';

export function AddressFormFields({ addressFormData, setAddressFormData }) {
  return (
    <>
      {/* Contact Information Section */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
          Contact Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dashboard-address-name"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Receiver Full Name*
            </label>
            <input
              id="dashboard-address-name"
              type="text"
              required
              placeholder="Receiver full name"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.name}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-phone"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Contact Phone Number*
            </label>
            <input
              id="dashboard-address-phone"
              type="tel"
              required
              placeholder="10-digit number"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.phone}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  phone: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-alt-phone"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Alternate Phone Number
            </label>
            <input
              id="dashboard-address-alt-phone"
              type="tel"
              placeholder="Optional alternate number"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.alternatePhone}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  alternatePhone: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-email"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Email Address
            </label>
            <input
              id="dashboard-address-email"
              type="email"
              placeholder="Enter email address"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.email}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  email: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Address Details Section */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
          Address Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dashboard-address-pincode"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              6-Digit Pincode*
            </label>
            <input
              id="dashboard-address-pincode"
              type="text"
              required
              placeholder="e.g. 560041"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.pincode}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  pincode: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-locality"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Locality / Sector*
            </label>
            <input
              id="dashboard-address-locality"
              type="text"
              required
              placeholder="e.g. Sector 4 / Jayanagar"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.locality}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  locality: e.target.value,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="dashboard-address-street"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Street Address & Building Details*
            </label>
            <textarea
              id="dashboard-address-street"
              required
              placeholder="Flat, House no., Building, Apartment details"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all min-h-[70px] font-semibold"
              value={addressFormData.addressString}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  addressString: e.target.value,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="dashboard-address-landmark"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Landmark*
            </label>
            <input
              id="dashboard-address-landmark"
              type="text"
              required
              placeholder="e.g. Near LPU Gate 1"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.landmark}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  landmark: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-city"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              City / District*
            </label>
            <input
              id="dashboard-address-city"
              type="text"
              required
              placeholder="City"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.city}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  city: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-state"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              State*
            </label>
            <input
              id="dashboard-address-state"
              type="text"
              required
              placeholder="State"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
              value={addressFormData.state}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  state: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-address-tag"
              className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Destination Type
            </label>
            <select
              id="dashboard-address-tag"
              value={addressFormData.tag}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  tag: e.target.value,
                })
              }
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Venue">Venue</option>
              <option value="Warehouse">Warehouse</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
