import { useCheckout } from '../CheckoutProvider';
import { useAddressForm } from '../useAddressForm';

import { AddAddressModal } from './components/AddAddressModal';
import { AddressList } from './components/AddressList';
import { MainDeliveryView } from './components/MainDeliveryView';

export default function CheckoutAddressStep() {
  const {
    activeItems,
    hasRentalItems,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    newAddress,
    setNewAddress,
    addressError,
    isProcessing,
    handleSaveNewAddress,
    PINCODE_MAP,
    checkoutSteps,
    user,
    isAddressesLoading,
  } = useCheckout();

  const {
    isSelectingList,
    setIsSelectingList,
    mapPosition,
    setMapPosition,
    fetchAddressFromCoords,
    handleEdit,
    handleAddNew,
    deliveryEstimates,
  } = useAddressForm({ setNewAddress, setIsAddingNewAddress, newAddress, user });

  if (isSelectingList) {
    return (
      <>
        <AddressList
          savedAddresses={savedAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          handleEdit={handleEdit}
          handleAddNew={handleAddNew}
          setIsSelectingList={setIsSelectingList}
        />
        <AddAddressModal
          isAddingNewAddress={isAddingNewAddress}
          setIsAddingNewAddress={setIsAddingNewAddress}
          newAddress={newAddress}
          setNewAddress={setNewAddress}
          addressError={addressError}
          isProcessing={isProcessing}
          handleSaveNewAddress={handleSaveNewAddress}
          PINCODE_MAP={PINCODE_MAP}
          mapPosition={mapPosition}
          setMapPosition={setMapPosition}
          fetchAddressFromCoords={fetchAddressFromCoords}
        />
      </>
    );
  }

  return (
    <>
      <MainDeliveryView
        activeSelectedAddress={activeSelectedAddress}
        hasRentalItems={hasRentalItems}
        setIsSelectingList={setIsSelectingList}
        handleAddNew={handleAddNew}
        activeItems={activeItems}
        deliveryEstimates={deliveryEstimates}
        setActiveStep={setActiveStep}
        checkoutSteps={checkoutSteps}
        isAddressesLoading={isAddressesLoading}
      />
      <AddAddressModal
        isAddingNewAddress={isAddingNewAddress}
        setIsAddingNewAddress={setIsAddingNewAddress}
        newAddress={newAddress}
        setNewAddress={setNewAddress}
        addressError={addressError}
        isProcessing={isProcessing}
        handleSaveNewAddress={handleSaveNewAddress}
        PINCODE_MAP={PINCODE_MAP}
        mapPosition={mapPosition}
        setMapPosition={setMapPosition}
        fetchAddressFromCoords={fetchAddressFromCoords}
      />
    </>
  );
}
