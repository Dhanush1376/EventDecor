import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { useCheckout } from "./CheckoutProvider";

let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition, fetchAddressFromCoords }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetchAddressFromCoords(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition(pos);
          fetchAddressFromCoords(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export default function CheckoutAddressStep() {
  const {
    activeItems,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    isDetectingLocation,
    newAddress,
    setNewAddress,
    addressError,
    setAddressError,
    isProcessing,
    handleSaveNewAddress,
    handleFetchCurrentLocation,
    PINCODE_MAP,
  } = useCheckout();

  // Local state to toggle between Main View and Select List View
  const [isSelectingList, setIsSelectingList] = useState(false);

  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      toast.loading("Locating address...", { id: "geocoding" });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        
        const newPincode = addr.postcode || "";
        const newCity = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
        const newState = addr.state || "";
        const newLocality = addr.suburb || addr.neighbourhood || addr.road || addr.residential || "";
        const newLandmark = addr.amenity || addr.building || addr.shop || "";
        const newHouse = addr.house_number || addr.name || "";
        
        setNewAddress(prev => ({
          ...prev,
          pincode: newPincode,
          city: newCity,
          state: newState,
          locality: newLocality,
          landmark: newLandmark || prev.landmark,
          address: newHouse || prev.address
        }));
        
        toast.success("Address auto-filled from map!", { id: "geocoding" });
      } else {
         toast.dismiss("geocoding");
      }
    } catch (err) {
      toast.error("Failed to auto-fill address from map", { id: "geocoding" });
    }
  };

  // If we have no saved addresses, force them to add one
  React.useEffect(() => {
    if (savedAddresses.length === 0) {
      setIsAddingNewAddress(true);
      setIsSelectingList(false);
    }
  }, [savedAddresses, setIsAddingNewAddress]);

  // Handle Edit Mode
  const handleEdit = (addr) => {
    setNewAddress({
      id: addr._id || addr.id,
      name: addr.name || "",
      phone: addr.phone || "",
      alternatePhone: addr.alternatePhone || "",
      email: addr.email || "",
      pincode: addr.pincode || "",
      locality: addr.locality || "",
      address: addr.addressString || addr.address || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "India",
      type: addr.tag || addr.type || "Home",
      deliveryInstructions: addr.deliveryInstructions || "",
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  const handleAddNew = () => {
    setNewAddress({
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      pincode: "",
      locality: "",
      address: "",
      landmark: "",
      city: "",
      state: "",
      country: "India",
      type: "Home",
      deliveryInstructions: "",
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  // Helper to get delivery estimate dates (e.g., +3 to +5 days)
  const getDeliveryEstimates = () => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date();
    end.setDate(end.getDate() + 5);
    
    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const deliveryEstimates = getDeliveryEstimates();

  // ------------------------------------------
  // STATE 3: ADD/EDIT ADDRESS FORM (Screenshot 2)
  // ------------------------------------------
  if (isAddingNewAddress) {
    return (
      <div className="bg-surface-container-low -mt-2">
        <form onSubmit={handleSaveNewAddress} className="pb-24">
          <div className="p-4 space-y-4">
            {addressError && (
              <div className="p-3 bg-red-50 text-red-600 rounded text-[11px] font-semibold mb-2">
                ⚠️ {addressError}
              </div>
            )}
            
            {/* Contact Details Block */}
            <div className="bg-surface-bright rounded-lg p-4 shadow-sm border border-outline-variant/20">
              <h2 className="text-[13px] font-bold text-on-surface mb-4">Contact Details</h2>
              <div className="space-y-4">
                <div className="relative mt-2">
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Name*"
                    value={newAddress.name}
                    onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="name" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Name*
                  </label>
                </div>
                <div className="relative mt-2">
                  <input
                    id="phone"
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="Mobile No*"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="phone" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Mobile No*
                  </label>
                </div>
                <div className="relative mt-2">
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="Email Address*"
                    value={newAddress.email}
                    onChange={(e) => setNewAddress({ ...newAddress, email: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="email" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Email Address*
                  </label>
                </div>
              </div>
            </div>

            {/* Address Block */}
            <div className="bg-surface-bright rounded-lg p-4 shadow-sm border border-outline-variant/20">
              <h2 className="text-[13px] font-bold text-on-surface mb-4">Address</h2>
              
              <div className="w-full h-48 bg-surface-container-low rounded-lg mb-4 relative overflow-hidden border border-outline-variant/30 z-0">
                 <MapContainer center={mapPosition} zoom={4} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                   <TileLayer
                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                   />
                   <LocationMarker position={mapPosition} setPosition={setMapPosition} fetchAddressFromCoords={fetchAddressFromCoords} />
                 </MapContainer>
                 <div className="absolute top-2 right-2 z-[1000]">
                   <button 
                     type="button" 
                     onClick={(e) => {
                       e.preventDefault();
                       toast.loading("Finding you...", { id: "gps" });
                       if (navigator.geolocation) {
                         navigator.geolocation.getCurrentPosition(
                           (pos) => {
                             const { latitude, longitude } = pos.coords;
                             setMapPosition({ lat: latitude, lng: longitude });
                             fetchAddressFromCoords(latitude, longitude);
                             toast.success("Location found!", { id: "gps" });
                           },
                           (err) => {
                             toast.error("Could not access GPS", { id: "gps" });
                           }
                         );
                       } else {
                         toast.error("Geolocation not supported by this browser", { id: "gps" });
                       }
                     }}
                     className="bg-white p-2 rounded shadow flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
                     title="Locate Me"
                   >
                     <span className="material-symbols-outlined text-[18px]">my_location</span>
                   </button>
                 </div>
              </div>

              <div className="space-y-4">
                <div className="relative mt-2">
                  <input
                    id="pincode"
                    type="tel"
                    required
                    maxLength={6}
                    placeholder="Pin Code*"
                    value={newAddress.pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      const updated = { ...newAddress, pincode: val };
                      if (val.length === 6 && PINCODE_MAP[val]) {
                        updated.city = PINCODE_MAP[val].city;
                        updated.state = PINCODE_MAP[val].state;
                      }
                      setNewAddress(updated);
                    }}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="pincode" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Pin Code*
                  </label>
                </div>

                <div className="relative mt-2">
                  <input
                    id="address"
                    type="text"
                    required
                    placeholder="House Number/Tower/Block*"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="address" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    House Number/Tower/Block*
                  </label>
                </div>

                <div className="relative mt-2">
                  <input
                    id="locality"
                    type="text"
                    required
                    placeholder="Address (locality,building,street)*"
                    value={newAddress.locality}
                    onChange={(e) => setNewAddress({ ...newAddress, locality: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="locality" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Address (locality,building,street)*
                  </label>
                </div>
                
                <div className="relative mt-2">
                  <input
                    id="landmark"
                    type="text"
                    required
                    placeholder="Landmark*"
                    value={newAddress.landmark}
                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                  />
                  <label htmlFor="landmark" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                    Landmark*
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative mt-2">
                    <input
                      id="city"
                      type="text"
                      required
                      placeholder="City / District*"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent"
                    />
                    <label htmlFor="city" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                      City / District*
                    </label>
                  </div>
                  <div className="relative mt-2">
                    <input
                      id="state"
                      type="text"
                      required
                      placeholder="State*"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="peer w-full h-12 border border-outline-variant rounded px-3 text-[13px] text-on-surface outline-none bg-transparent focus:border-primary transition-colors placeholder-transparent uppercase"
                    />
                    <label htmlFor="state" className="absolute left-2 -top-2 bg-surface-bright px-1 text-[11px] text-secondary transition-all peer-placeholder-shown:text-[13px] peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[11px] peer-focus:bg-surface-bright peer-focus:text-primary pointer-events-none">
                      State*
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Type Block */}
            <div className="bg-surface-bright rounded-lg p-4 shadow-sm border border-outline-variant/20">
               <h2 className="text-[12px] font-bold text-on-surface mb-3">Address Type</h2>
               <div className="flex items-center gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${newAddress.type === 'Home' ? 'border-primary' : 'border-outline-variant'}`}>
                      {newAddress.type === 'Home' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                    </div>
                    <span className="text-[13px] text-on-surface">Home</span>
                    <input type="radio" className="hidden" checked={newAddress.type === 'Home'} onChange={() => setNewAddress({...newAddress, type: 'Home'})} />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${newAddress.type === 'Work' || newAddress.type === 'Office' ? 'border-primary' : 'border-outline-variant'}`}>
                      {(newAddress.type === 'Work' || newAddress.type === 'Office') && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                    </div>
                    <span className="text-[13px] text-on-surface">Office</span>
                    <input type="radio" className="hidden" checked={newAddress.type === 'Work' || newAddress.type === 'Office'} onChange={() => setNewAddress({...newAddress, type: 'Office'})} />
                  </label>
               </div>
               
               <label className="flex items-center gap-2 cursor-pointer mt-2">
                 <div className={`w-4 h-4 rounded flex items-center justify-center ${true ? 'bg-primary' : 'border border-outline-variant'}`}>
                    <span className="material-symbols-outlined text-[12px] text-surface font-bold">check</span>
                 </div>
                 <span className="text-[12px] text-on-surface">Make this as my default address</span>
               </label>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 max-w-[768px] mx-auto flex gap-3">
             <button
               type="button"
               onClick={() => {
                 if (savedAddresses.length > 0) {
                   setIsAddingNewAddress(false);
                 } else {
                   toast.error("Please add at least one address to continue.");
                 }
               }}
               className="flex-1 py-3 bg-surface-bright text-on-surface font-extrabold uppercase text-[13px] tracking-widest border border-outline-variant rounded"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={isProcessing}
               className="flex-1 py-3 bg-[#f26a10] hover:bg-[#d85d0d] text-white font-extrabold uppercase text-[13px] tracking-widest rounded shadow-md disabled:opacity-70"
             >
               {isProcessing ? "Saving..." : "Save"}
             </button>
          </div>
        </form>
      </div>
    );
  }

  // ------------------------------------------
  // STATE 2: SELECT ADDRESS LIST (Screenshot 3)
  // ------------------------------------------
  if (isSelectingList) {
    return (
      <div className="bg-surface-bright pb-24">
         <div className="p-4">
            <button 
              onClick={handleAddNew}
              className="w-full py-3.5 border border-outline-variant/60 rounded text-[12px] font-extrabold uppercase tracking-widest text-primary shadow-sm hover:bg-surface-container-low transition-colors"
            >
              Add New Address
            </button>
         </div>

         <div className="bg-surface-container-low px-4 py-2 text-[11px] font-bold text-secondary uppercase tracking-widest border-y border-outline-variant/20">
            Default Address
         </div>

         <div className="divide-y divide-outline-variant/20">
            {savedAddresses.map((addr) => {
               const addrId = addr._id || addr.id;
               const isSelected = selectedAddressId === addrId;
               return (
                 <div key={addrId} className="p-4">
                    <div className="flex gap-3">
                       <div className="pt-1 cursor-pointer" onClick={() => setSelectedAddressId(addrId)}>
                         <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${isSelected ? 'border-primary' : 'border-outline-variant'}`}>
                           {isSelected && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                         </div>
                       </div>
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-[13px] font-bold text-on-surface">{addr.name}</span>
                             {addr.tag && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-primary text-primary rounded-full">
                                  {addr.tag}
                                </span>
                             )}
                          </div>
                          <p className="text-[12px] text-secondary leading-relaxed mb-1">
                             {addr.addressString || addr.address}, {addr.locality}, {addr.city}, {addr.state} {addr.pincode}
                          </p>
                          <p className="text-[12px] text-secondary">
                             Mobile: <span className="font-bold text-on-surface">{addr.phone}</span>
                          </p>

                          {isSelected && (
                            <div className="flex gap-3 mt-4">
                               <button 
                                 className="px-6 py-2 border border-outline-variant rounded text-[11px] font-bold text-on-surface uppercase tracking-wider"
                               >
                                 Remove
                               </button>
                               <button 
                                 onClick={() => handleEdit(addr)}
                                 className="px-6 py-2 border border-outline-variant rounded text-[11px] font-bold text-on-surface uppercase tracking-wider"
                               >
                                 Edit
                               </button>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
               );
            })}
         </div>

         {/* Sticky Action Footer */}
         <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 max-w-[768px] mx-auto">
            <button
              onClick={() => setIsSelectingList(false)}
              className="w-full bg-[#f26a10] hover:bg-[#d85d0d] text-white py-3.5 rounded-[4px] text-[13px] font-extrabold uppercase tracking-widest shadow-sm transition-colors text-center"
            >
              Confirm
            </button>
         </div>
      </div>
    );
  }

  // ------------------------------------------
  // STATE 1: MAIN DELIVERY VIEW (Screenshot 1)
  // ------------------------------------------
  return (
    <div className="bg-surface-container-low -mt-2">
      {/* Selected Address Block */}
      <div className="bg-surface-bright mb-2 p-4 pt-6 shadow-sm">
        {activeSelectedAddress && (
          <div className="relative">
            <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                 <span className="text-[14px] font-extrabold text-on-surface">
                   {activeSelectedAddress.name}
                 </span>
                 <span className="text-[11px] text-secondary">(Default)</span>
                 {activeSelectedAddress.tag && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-primary text-primary rounded-full">
                      {activeSelectedAddress.tag}
                    </span>
                 )}
               </div>
               <button 
                 onClick={() => setIsSelectingList(true)}
                 className="text-[12px] font-bold text-primary uppercase tracking-wide cursor-pointer"
               >
                 Change
               </button>
            </div>
            
            <p className="text-[13px] text-on-surface leading-relaxed w-[85%]">
               {activeSelectedAddress.addressString || activeSelectedAddress.address}<br />
               {activeSelectedAddress.locality}<br />
               {activeSelectedAddress.city}, {activeSelectedAddress.state} {activeSelectedAddress.pincode}
            </p>
            
            <div className="mt-3 text-[13px]">
               <span className="text-secondary">Mobile: </span>
               <span className="font-extrabold text-on-surface">{activeSelectedAddress.phone}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Estimates Block */}
      <div className="bg-surface-container-low px-4 py-3 text-[11px] font-bold text-secondary uppercase tracking-widest">
         Delivery Estimates
      </div>
      
      <div className="bg-surface-bright p-4 shadow-sm border-t border-outline-variant/10 flex flex-col gap-4">
        {activeItems.map(item => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="w-12 h-14 bg-surface-container-low rounded overflow-hidden flex-shrink-0">
               <img src={item.imageSrc} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="text-[13px] text-on-surface">
              Delivery between <span className="font-extrabold">{deliveryEstimates}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 max-w-[768px] mx-auto">
         <button
           onClick={() => setActiveStep(2)} // Proceed to Payment
           className="w-full bg-[#f26a10] hover:bg-[#d85d0d] text-white py-3.5 rounded-[4px] text-[13px] font-extrabold uppercase tracking-widest shadow-sm transition-colors text-center"
         >
           Continue
         </button>
      </div>
    </div>
  );
}
