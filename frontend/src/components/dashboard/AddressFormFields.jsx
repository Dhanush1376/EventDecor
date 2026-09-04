import { User, Home } from 'lucide-react';
import React from 'react';

export function AddressFormFields({ addressFormData, setAddressFormData }) {
  return (
    <>
      {/* Contact Information Section */}
      {/* Contact Information Section */}
      <div className="py-5 border-b border-outline-variant/20">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-secondary mb-5 flex items-center gap-1.5">
          <User className="text-[12px]" strokeWidth={1.5} />
          Contact Details
        </h4>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dashboard-address-name" className="form-label">
                Receiver Full Name*
              </label>
              <input
                id="dashboard-address-name"
                type="text"
                required
                placeholder="Receiver full name"
                className="form-field"
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
              <label htmlFor="dashboard-address-email" className="form-label">
                Email Address
              </label>
              <input
                id="dashboard-address-email"
                type="email"
                placeholder="Enter email address"
                className="form-field"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dashboard-address-phone" className="form-label">
                Phone Number*
              </label>
              <input
                id="dashboard-address-phone"
                type="tel"
                required
                placeholder="10-digit number"
                className="form-field"
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
              <label htmlFor="dashboard-address-alt-phone" className="form-label">
                Alternate Number
              </label>
              <input
                id="dashboard-address-alt-phone"
                type="tel"
                placeholder="Optional alternate number"
                className="form-field"
                value={addressFormData.alternatePhone}
                onChange={(e) =>
                  setAddressFormData({
                    ...addressFormData,
                    alternatePhone: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Details Section */}
      <div className="py-5">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-secondary mb-5 flex items-center gap-1.5">
          <Home className="text-[12px]" strokeWidth={1.5} />
          Address Information
        </h4>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dashboard-address-pincode" className="form-label">
                6-Digit Pincode*
              </label>
              <input
                id="dashboard-address-pincode"
                type="text"
                required
                placeholder="e.g. 560041"
                className="form-field"
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
              <label htmlFor="dashboard-address-locality" className="form-label">
                Locality / Sector*
              </label>
              <input
                id="dashboard-address-locality"
                type="text"
                required
                placeholder="e.g. Sector 4 / Jayanagar"
                className="form-field"
                value={addressFormData.locality}
                onChange={(e) =>
                  setAddressFormData({
                    ...addressFormData,
                    locality: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="dashboard-address-street" className="form-label">
              Street Address & Building Details*
            </label>
            <textarea
              id="dashboard-address-street"
              required
              placeholder="Flat, House no., Building, Apartment details"
              className="form-field min-h-[70px]"
              value={addressFormData.addressString}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  addressString: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label htmlFor="dashboard-address-landmark" className="form-label">
              Landmark*
            </label>
            <input
              id="dashboard-address-landmark"
              type="text"
              required
              placeholder="e.g. Near LPU Gate 1"
              className="form-field"
              value={addressFormData.landmark}
              onChange={(e) =>
                setAddressFormData({
                  ...addressFormData,
                  landmark: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dashboard-address-city" className="form-label">
                City / District*
              </label>
              <input
                id="dashboard-address-city"
                type="text"
                required
                placeholder="City"
                className="form-field"
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
              <label htmlFor="dashboard-address-state" className="form-label">
                State*
              </label>
              <input
                id="dashboard-address-state"
                type="text"
                required
                placeholder="State"
                className="form-field"
                value={addressFormData.state}
                onChange={(e) =>
                  setAddressFormData({
                    ...addressFormData,
                    state: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="dashboard-address-tag" className="form-label">
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
              className="form-field cursor-pointer"
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
