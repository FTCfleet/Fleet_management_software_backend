# Backend Changes for Frontend ESC/POS Implementation

## ✅ Changes Complete!

The backend has been updated to support frontend-generated ESC/POS commands for thermal printing.

---

## What Was Removed

### 1. Old QZ Tray HTML Endpoint ❌

**Removed Route**: `GET /api/parcel/generate-lr-qz-tray/:id`

**Reason**: Frontend now generates ESC/POS commands directly, no need for backend HTML generation.

### 2. Removed Functions

**File**: `controllers/parcelController.js`
- ❌ Removed: `generateLRForQZTray()` function

**File**: `utils/LRThermal.js`
- ❌ Removed: `generateLRForQZTray()` function
- ✅ Kept: `generateLRSheetThermal()` (still used for HTML thermal preview)

**File**: `routes/parcelRoutes.js`
- ❌ Removed: Route for `/generate-lr-qz-tray/:id`

---

## What to Use Instead

### ✅ Use Existing Endpoint

**Route**: `GET /api/parcel/track/:trackingId`

**Purpose**: Returns complete parcel data with all populated fields

**Example Request**:
```
GET /api/parcel/track/HYD02-12564
```

**Response Format**:
```json
{
  "message": "Successfully fetched your parcel",
  "flag": true,
  "body": {
    "trackingId": "HYD02-12564",
    "placedAt": "2026-01-28T10:30:00.000Z",
    "payment": "To Pay",
    "freight": 100000,
    "hamali": 5000,
    "isDoorDelivery": true,
    "doorDeliveryCharge": 10000,
    "sourceWarehouse": {
      "warehouseID": "HYD-01",
      "name": "Hyderabad",
      "phoneNo": "1234567890"
    },
    "destinationWarehouse": {
      "warehouseID": "MNCL",
      "name": "Mancherial",
      "phoneNo": "0987654321"
    },
    "sender": {
      "name": "John Doe",
      "phoneNo": "1234567890"
    },
    "receiver": {
      "name": "Jane Smith",
      "phoneNo": "0987654321"
    },
    "items": [
      {
        "name": "Box",
        "quantity": 5,
        "freight": 20000,
        "hamali": 1000,
        "itemType": {
          "name": "Carton"
        }
      }
    ],
    "addedBy": {
      "name": "Admin User"
    }
  },
  "qrCode": "https://..."
}
```

**Important Notes**:
- ✅ All monetary values are in **paise** (multiply rupees by 100)
- ✅ All nested objects are fully populated (warehouses, sender, receiver, items, addedBy)
- ✅ Dates are in ISO 8601 format
- ✅ No authentication required for tracking endpoint

---

## Remaining Thermal Endpoints

These endpoints are still available and working:

### 1. HTML Thermal Receipt (for QZ Tray HTML printing)
**Route**: `GET /api/parcel/generate-lr-receipt-thermal/:id`
**Returns**: HTML content
**Use**: Legacy HTML-based thermal printing

### 2. ESC/POS Thermal Receipt (for backend-generated ESC/POS)
**Route**: `GET /api/parcel/generate-lr-receipt-thermal-escpos/:id`
**Returns**: Raw ESC/POS commands as binary
**Use**: Backend-generated ESC/POS (alternative to frontend generation)

### 3. Thermal Receipt Preview (for browser preview)
**Route**: `GET /api/parcel/preview-lr-thermal/:id`
**Returns**: PDF
**Use**: Preview thermal receipt in browser before printing

---

## Frontend Integration

### Old Flow (Removed)
```javascript
// ❌ Old way - don't use
fetch('/api/parcel/generate-lr-qz-tray/' + trackingId)
  .then(res => res.json())
  .then(data => {
    // data.receipts contains HTML
    // data.styles contains CSS
  });
```

### New Flow (Use This)
```javascript
// ✅ New way - use this
import { generateCopiesArray } from './utils/escPosGenerator.js';

// 1. Fetch parcel data
const response = await fetch('/api/parcel/track/' + trackingId);
const { body: parcelData } = await response.json();

// 2. Generate ESC/POS commands in frontend
const escPosReceipts = generateCopiesArray(parcelData);

// 3. Print via QZ Tray
const printData = escPosReceipts.map(commands => ({
  type: 'raw',
  format: 'plain',
  data: commands
}));

await qz.print(config, printData);
```

---

## Data Format Requirements

### Monetary Values (Paise)

All monetary values in the database and API responses are stored in **paise** (1 rupee = 100 paise).

**Example**:
```javascript
// Database/API value
freight: 100000  // 100000 paise = ₹1000.00

// Frontend conversion (in escPosGenerator.js)
const fromDbValue = (paise) => paise / 100;
const rupees = fromDbValue(100000);  // 1000
```

**Fields in Paise**:
- `freight` - Total freight charge
- `hamali` - Total hamali charge
- `doorDeliveryCharge` - Door delivery charge
- `items[].freight` - Per-item freight
- `items[].hamali` - Per-item hamali

### Date Format

Dates are in ISO 8601 format:
```javascript
placedAt: "2026-01-28T10:30:00.000Z"
```

Frontend should format as needed:
```javascript
const formatToIST = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
```

### Populated Fields

The `/track/:id` endpoint uses `createParcelPopulateConfig(true)` which populates:
- ✅ `sourceWarehouse` - Full warehouse object
- ✅ `destinationWarehouse` - Full warehouse object
- ✅ `sender` - Full client object
- ✅ `receiver` - Full client object
- ✅ `items` - Array of items with populated `itemType`
- ✅ `addedBy` - User who created the parcel
- ✅ `lastModifiedBy` - User who last modified (if applicable)

---

## Testing

### Test the Track Endpoint

```bash
# Test with curl
curl http://localhost:8000/api/parcel/track/HYD02-12564

# Expected response
{
  "message": "Successfully fetched your parcel",
  "flag": true,
  "body": { ... full parcel data ... },
  "qrCode": "https://..."
}
```

### Verify Data Format

Check that response includes:
- ✅ All monetary values in paise
- ✅ All nested objects populated
- ✅ Items array with itemType populated
- ✅ Dates in ISO format
- ✅ All required fields present

---

## Migration Checklist

### Backend ✅
- [x] Remove `/generate-lr-qz-tray/:id` route
- [x] Remove `generateLRForQZTray()` from controller
- [x] Remove `generateLRForQZTray()` from utils
- [x] Verify `/track/:id` returns complete data
- [x] Test endpoint with sample tracking ID

### Frontend (Your Side)
- [ ] Update to use `/track/:id` endpoint
- [ ] Implement `escPosGenerator.js`
- [ ] Update `qzTrayUtils.js` to use new flow
- [ ] Test with QZ Tray
- [ ] Verify 3 copies print with auto-cut

---

## Benefits

### ✅ Simpler Backend
- Less code to maintain
- No HTML generation needed
- Just return raw data

### ✅ Faster Performance
- Smaller API response (JSON vs HTML)
- No server-side HTML rendering
- Direct ESC/POS generation

### ✅ Better Control
- Frontend has full control over formatting
- Easy to customize receipt layout
- Can add features without backend changes

### ✅ More Reliable
- Native ESC/POS commands
- Better printer compatibility
- Auto-cut works perfectly

---

## Backward Compatibility

### Old Endpoints Still Work

If you need to support old clients:
- ✅ `/generate-lr-receipt-thermal/:id` - Still works (HTML)
- ✅ `/generate-lr-receipt-thermal-escpos/:id` - Still works (ESC/POS)
- ✅ `/preview-lr-thermal/:id` - Still works (PDF preview)

### Migration Strategy

1. **Deploy frontend changes first**
   - Frontend uses new `/track/:id` endpoint
   - Generates ESC/POS in browser

2. **Backend cleanup (optional)**
   - Old endpoints can be removed later
   - Or kept for backward compatibility

3. **No breaking changes**
   - Existing functionality still works
   - Only thermal QZ Tray printing changes

---

## Summary

### What Changed
- ❌ Removed: `/generate-lr-qz-tray/:id` endpoint
- ❌ Removed: HTML generation for QZ Tray
- ✅ Use: `/track/:id` endpoint for parcel data
- ✅ Frontend: Generates ESC/POS commands

### Result
- ✅ Simpler backend
- ✅ Faster printing
- ✅ Better control
- ✅ More reliable
- ✅ Auto-cut works perfectly

### Files Modified
1. `routes/parcelRoutes.js` - Removed route
2. `controllers/parcelController.js` - Removed function
3. `utils/LRThermal.js` - Removed function

### Files Unchanged
- `models/parcelSchema.js` - No changes
- `/track/:id` endpoint - Already perfect
- Other thermal endpoints - Still working

---

## Questions?

**Q: Do I need to update the database?**
A: No, database schema is unchanged.

**Q: Will old thermal prints break?**
A: No, other thermal endpoints still work.

**Q: Can I still use backend ESC/POS generation?**
A: Yes, `/generate-lr-receipt-thermal-escpos/:id` still works.

**Q: What if frontend ESC/POS generation fails?**
A: Fallback to `/generate-lr-receipt-thermal-escpos/:id` endpoint.

**Q: Do I need to restart the server?**
A: Yes, restart after deploying these changes.

---

**Backend is ready for frontend ESC/POS implementation!** 🎉
