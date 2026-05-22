import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src/pages/Checkout.jsx"), "utf8");
const lines = src.split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const steps = [
  {
    name: "CheckoutAddressStep",
    start: 658,
    end: 1299,
    vars:
      "activeStep, setActiveStep, activeSelectedAddress, savedAddresses, setSavedAddresses, selectedAddressId, setSelectedAddressId, isAddingNewAddress, setIsAddingNewAddress, isDetectingLocation, newAddress, setNewAddress, sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp, addressError, setAddressError, isProcessing, handleSaveNewAddress, handleFetchCurrentLocation, PINCODE_MAP, user",
  },
  {
    name: "CheckoutOrderSummaryStep",
    start: 1301,
    end: 1505,
    vars:
      "activeStep, setActiveStep, activeSelectedAddress, activeItems, needByDate, setNeedByDate, isAddingNewAddress, settings",
  },
  {
    name: "CheckoutPaymentStep",
    start: 1507,
    end: 1774,
    vars:
      "activeStep, setActiveStep, activeSelectedAddress, isAddingNewAddress, paymentOption, setPaymentOption, upiId, setUpiId, upiVerified, setUpiVerified, cardDetails, setCardDetails, selectedBank, setSelectedBank, codConfirmed, setCodConfirmed, codOtpSent, codOtpCode, codOtpInput, setCodOtpInput, codVerified, isSendingOtp, paymentError, setPaymentError, handleSendCodOtp, handleVerifyCodOtp, backendTotals, UPI_REGEX, settings, user",
  },
  {
    name: "CheckoutSidebar",
    start: 1777,
    end: 2056,
    vars:
      "user, backendTotals, useWallet, setUseWallet, appliedCoupon, couponValid, couponInput, setCouponInput, handleApplyCoupon, handleRemoveCoupon, couponMessage, availableCoupons, loadingCoupons, activeStep, paymentOption, isProcessing, handleConfirmOrder",
  },
];

const baseImports = `import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";
`;

const outDir = path.join(root, "src/checkout");

for (const s of steps) {
  const body = slice(s.start, s.end);
  const file = `${baseImports}

export default function ${s.name}() {
  const { ${s.vars} } = useCheckout();
  return (
${body}
  );
}
`;
  fs.writeFileSync(path.join(outDir, `${s.name}.jsx`), file, "utf8");
}

console.log("checkout steps written");
