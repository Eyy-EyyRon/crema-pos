import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountSheet } from './components/AccountSheet';
import { CloseShiftModal, OpenShiftModal } from './components/ShiftModal';
import { CustomizeSheet } from './components/CustomizeSheet';
import { CustomizeSidebar } from './components/CustomizeSidebar';
import { GcashProofCameraModal } from './components/GcashProofCameraModal';
import { GcashQrModal } from './components/GcashQrModal';
import { OfflineBanner } from './components/OfflineBanner';
import { NewOrderAlertBanner } from './components/NewOrderAlertBanner';
import { OutboxModal } from './components/OutboxModal';
import { QueueModal } from './components/QueueModal';
import { QrScannerModal } from './components/QrScannerModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { ShiftCloseSummaryModal } from './components/ShiftCloseSummaryModal';
import { SuccessModal } from './components/SuccessModal';
import { UndoToast } from './components/UndoToast';
import { UpdateBanner } from './components/UpdateBanner';
import { HistoryScreen } from './screens/HistoryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { MenuPane } from './screens/MenuPane';
import { MenuScreen } from './screens/MenuScreen';
import { OrderDock } from './screens/OrderDock';
import { OrderTypeScreen } from './screens/OrderTypeScreen';
import { QueueScreen } from './screens/QueueScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { useBreakpoint } from './breakpoints';
import { colors } from './theme';
import { useCremaPos } from './useCremaPos';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function PosApp() {
  const { isSplit } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [closeShiftVisible, setCloseShiftVisible] = useState(false);
  const [stockAdjustVisible, setStockAdjustVisible] = useState(false);
  const rootStyle = [styles.root, { paddingLeft: insets.left, paddingRight: insets.right }];

  const pos = useCremaPos();
  const { state } = pos;

  if (state.authLoading) {
    return (
      <View style={rootStyle}>
        <Splash />
      </View>
    );
  }

  if (!state.currentUser) {
    return (
      <View style={rootStyle}>
        <LoginScreen onLogin={pos.login} />
      </View>
    );
  }

  if (state.shiftLoading) {
    return (
      <View style={rootStyle}>
        <Splash />
      </View>
    );
  }

  if (!state.shift) {
    return (
      <View style={rootStyle}>
        <OpenShiftModal visible onSubmit={pos.openShiftAction} />
      </View>
    );
  }

  const undoRemovedItem = pos.pendingUndo ? { name: pos.pendingUndo.item.name, qty: pos.pendingUndo.item.qty } : null;

  const currentUser = state.currentUser;
  const orderTypeLabel = state.orderType === 'dine-in' ? 'Dine-In' : 'Takeout';
  const giftCardReady = state.splitEnabled || state.payMethod !== 'gift_card'
    || (!!state.giftCardCode.trim() && !pos.giftCardInsufficient);

  // Checkout customization (manager's Feature Toggles page, cafe-web-dashboard) — gates which
  // handlers get wired below. useCremaPos's fetchMenuData already keeps payMethod/orderType/
  // splitEnabled/discountName/redeemPoints valid whenever these flags change; this is just what
  // decides which buttons/sections are even reachable in between those corrections.
  const { storeSettings } = state;
  const allowCash = storeSettings.checkoutAllowCash;
  const allowGcash = storeSettings.checkoutAllowGcash;
  const allowGiftCard = storeSettings.checkoutAllowGiftCard;
  const allowSplitPayment = storeSettings.checkoutAllowSplitPayment;
  const allowDineIn = storeSettings.checkoutAllowDineIn;
  const allowTakeout = storeSettings.checkoutAllowTakeout;
  const allowDiscounts = storeSettings.checkoutAllowDiscounts;
  const allowLoyaltyRedemption = storeSettings.checkoutAllowLoyaltyRedemption;
  const customerNameMissing = !state.appendTargetOrderId && storeSettings.checkoutRequireCustomerName
    && !state.customerName.trim() && !state.selectedCustomer?.fullName;

  const canPay = state.cart.length > 0 && !pos.shortfall && !pos.gcashUnconfirmed && !pos.splitAmountMismatch
    && giftCardReady && !state.gcashProofUploading && !customerNameMissing;
  const userName = currentUser.full_name;
  const receiptStoreInfo = {
    storeName: state.storeSettings.storeName,
    tagline: state.storeSettings.tagline,
    address: state.storeSettings.address,
    phone: state.storeSettings.phone,
    tin: state.storeSettings.tin,
    receiptFooter: state.storeSettings.receiptFooter,
  };

  const customizeProps = pos.selectedItem
    ? {
        category: pos.selectedItem.category,
        name: pos.selectedItem.name,
        basePrice: pos.selectedItem.price,
        groups: pos.selectedItemGroups,
        selMods: state.selMods,
        onToggleMod: pos.toggleMod,
        note: state.note,
        onNote: (v: string) => pos.patch({ note: v }),
        qty: state.qty,
        onIncQty: () => pos.patch({ qty: Math.min(pos.maxAddableForSelected, state.qty + 1) }),
        onDecQty: () => pos.patch({ qty: Math.max(1, state.qty - 1) }),
        addUnitTotal: pos.addUnitTotal,
        addValid: pos.addValid,
        onAdd: pos.addToCart,
        onClose: pos.closeItem,
      }
    : null;

  const checkoutSharedProps = {
    cart: state.cart,
    onInc: (cartId: string) => pos.changeQty(cartId, 1),
    onDec: (cartId: string) => pos.changeQty(cartId, -1),
    onRemove: pos.removeFromCart,
    orderType: state.orderType,
    onSelectDineIn: allowDineIn ? () => pos.selectType('dine-in') : undefined,
    onSelectTakeout: allowTakeout ? () => pos.selectType('takeout') : undefined,
    customerName: state.customerName,
    onChangeCustomerName: (v: string) => pos.patch({ customerName: v }),
    customerNameRequired: storeSettings.checkoutRequireCustomerName,
    discounts: pos.eligibleDiscounts,
    discountName: state.discountName,
    discountPct: pos.discountPct,
    discountLabel: pos.discountLabel,
    onSelectDiscount: (name: string) => pos.patch({ discountName: name, redeemPoints: name !== 'None' ? '' : state.redeemPoints }),
    allowDiscounts,
    payMethod: state.payMethod,
    onSelectCash: allowCash ? () => pos.patch({ payMethod: 'cash' as const, gcashReference: '', gcashConfirmed: false, gcashProofUri: null, gcashProofUrl: null, gcashProofUploading: false, giftCardCode: '', giftCardBalance: null, giftCardError: null }) : undefined,
    onSelectGcash: allowGcash ? () => pos.patch({ payMethod: 'gcash' as const, tendered: '', showGcashQr: true, gcashReference: '', gcashConfirmed: false, gcashProofUri: null, gcashProofUrl: null, gcashProofUploading: false, giftCardCode: '', giftCardBalance: null, giftCardError: null }) : undefined,
    onSelectGiftCard: allowGiftCard ? () => pos.patch({ payMethod: 'gift_card' as const, splitEnabled: false, tendered: '', gcashReference: '', gcashConfirmed: false, gcashProofUri: null, gcashProofUrl: null, gcashProofUploading: false }) : undefined,
    onViewGcashQr: () => pos.patch({ showGcashQr: true }),
    giftCardCode: state.giftCardCode,
    onChangeGiftCardCode: (v: string) => pos.patch({ giftCardCode: v, giftCardBalance: null, giftCardError: null }),
    onCheckGiftCardBalance: pos.checkGiftCardBalanceAction,
    giftCardChecking: state.giftCardChecking,
    giftCardBalance: state.giftCardBalance,
    giftCardError: state.giftCardError,
    customerPhone: state.customerPhone,
    onChangeCustomerPhone: (v: string) => pos.patch({ customerPhone: v, customerLookupStatus: 'idle' }),
    onLookupCustomer: pos.lookupCustomer,
    customerLookupStatus: state.customerLookupStatus,
    customerLookupMode: state.customerLookupMode,
    onChangeCustomerLookupMode: pos.changeCustomerLookupMode,
    customerCardCode: state.customerCardCode,
    onChangeCustomerCardCode: (v: string) => pos.patch({ customerCardCode: v, customerLookupStatus: 'idle', customerLookupMessage: null }),
    customerLookupMessage: state.customerLookupMessage,
    onOpenQrScanner: () => pos.openQrScanner('loyalty'),
    onOpenGiftCardScanner: () => pos.openQrScanner('gift_card'),
    foundCustomerName: state.selectedCustomer?.fullName ?? null,
    foundCustomerPoints: state.selectedCustomer?.loyaltyPoints ?? 0,
    newCustomerName: state.newCustomerName,
    onChangeNewCustomerName: (v: string) => pos.patch({ newCustomerName: v }),
    onCreateCustomer: pos.createCustomerInline,
    customerCreating: state.customerCreating,
    onClearCustomer: pos.clearSelectedCustomer,
    loyaltyEnabled: state.storeSettings.loyaltyEnabled,
    allowLoyaltyRedemption,
    loyaltyPointValuePhp: state.storeSettings.loyaltyPointValuePhp,
    redeemPoints: state.redeemPoints,
    onChangeRedeemPoints: (v: string) => pos.patch({
      redeemPoints: v,
      discountName: Number(v) > 0 ? 'None' : state.discountName,
      splitEnabled: Number(v) > 0 ? false : state.splitEnabled,
    }),
    maxRedeemablePoints: pos.maxRedeemablePoints,
    pointsToEarnPreview: pos.pointsToEarnPreview,
    loyaltyRedemptionAmount: pos.loyaltyRedemptionAmount,
    amountDue: pos.amountDue,
    receiptEmail: state.receiptEmail,
    onChangeReceiptEmail: (v: string) => pos.patch({ receiptEmail: v }),
    tendered: state.tendered,
    onChangeTendered: (v: string) => pos.patch({ tendered: v }),
    quickCash: pos.quickCash,
    onQuickCash: (v: number) => pos.patch({ tendered: String(v) }),
    tenderNum: pos.tenderNum,
    change: pos.change,
    shortfall: pos.shortfall,
    gcashReference: state.gcashReference,
    onChangeGcashReference: (v: string) => pos.patch({ gcashReference: v }),
    gcashConfirmed: state.gcashConfirmed,
    onToggleGcashConfirmed: () => pos.patch({ gcashConfirmed: !state.gcashConfirmed }),
    gcashProofUri: state.gcashProofUri,
    gcashProofUploading: state.gcashProofUploading,
    gcashProofFailed: !!state.gcashProofUri && !state.gcashProofUrl && !state.gcashProofUploading,
    onOpenGcashProofCamera: () => pos.patch({ showGcashProofCamera: true }),
    splitEnabled: state.splitEnabled,
    onToggleSplit: allowSplitPayment ? () => pos.patch({
      splitEnabled: !state.splitEnabled,
      splitCashAmount: '', splitGcashAmount: '',
      gcashReference: '', gcashConfirmed: false,
      gcashProofUri: null, gcashProofUrl: null, gcashProofUploading: false,
      redeemPoints: '',
    }) : undefined,
    splitCashAmount: state.splitCashAmount,
    onChangeSplitCashAmount: (v: string) => pos.patch({ splitCashAmount: v }),
    splitGcashAmount: state.splitGcashAmount,
    onChangeSplitGcashAmount: (v: string) => pos.patch({ splitGcashAmount: v }),
    splitAmountMismatch: pos.splitAmountMismatch,
    subtotal: pos.totals.sub,
    discount: pos.totals.disc,
    service: pos.totals.service,
    tax: pos.totals.tax,
    total: pos.totals.total,
    taxRatePct: state.storeSettings.taxRatePct,
    isTaxInclusive: state.storeSettings.isTaxInclusive,
    serviceChargePct: state.storeSettings.serviceChargePct,
    canPay,
    onPay: pos.checkout,
    checkoutBusy: state.checkoutBusy,
    checkoutError: state.checkoutError,
    appendTargetOrderNo: state.appendTargetOrderId ? state.appendTargetOrderNo : null,
    onCancelAppend: pos.cancelAddToOrder,
  };

  const accountSheet = (
    <>
      <AccountSheet
        visible={state.showAccount}
        user={currentUser}
        shift={state.shift}
        upcomingShifts={state.upcomingShifts}
        uploading={state.avatarUploading}
        outboxCount={state.outboxCount}
        onClose={() => pos.patch({ showAccount: false })}
        onHistory={() => pos.patch({ showAccount: false, screen: 'history' })}
        onLock={() => { pos.patch({ showAccount: false }); pos.lockPos(); }}
        onUploadAvatar={() => { pos.uploadAvatar(); }}
        onCloseShift={() => { pos.patch({ showAccount: false }); setCloseShiftVisible(true); }}
        onOpenOutbox={() => { pos.patch({ showAccount: false }); pos.openOutbox(); }}
        onOpenStockAdjust={() => { pos.patch({ showAccount: false }); setStockAdjustVisible(true); }}
      />
      <OutboxModal
        visible={state.showOutbox}
        entries={pos.outboxEntries}
        onClose={pos.closeOutbox}
        onRetry={pos.retryOutboxEntry}
        onDelete={pos.deleteOutboxEntry}
      />
      <StockAdjustModal
        visible={stockAdjustVisible}
        ingredients={state.ingredientsList}
        isOffline={state.isOffline}
        onClose={() => setStockAdjustVisible(false)}
        onSubmit={pos.adjustStockManual}
      />
      <CloseShiftModal
        visible={closeShiftVisible}
        onCancel={() => setCloseShiftVisible(false)}
        onSubmit={async (cash) => {
          const err = await pos.closeShiftAction(cash);
          if (!err) setCloseShiftVisible(false);
          return err;
        }}
      />
      <ShiftCloseSummaryModal
        visible={!!state.shiftCloseSummary}
        summary={state.shiftCloseSummary}
        onDone={pos.dismissShiftCloseSummary}
      />
    </>
  );

  if (state.screen === 'history') {
    return (
      <View style={rootStyle}>
        <OfflineBanner visible={state.isOffline} />
        <NewOrderAlertBanner alert={state.newOrderAlert} onDismiss={() => pos.patch({ newOrderAlert: null })} />
        {pos.updateAvailable && (
          <UpdateBanner version={pos.updateAvailable.version} url={pos.updateAvailable.url} onDismiss={pos.dismissUpdate} />
        )}
        <HistoryScreen
          onBack={() => pos.patch({ screen: 'menu' })}
          onFlagVoid={pos.flagVoidOrder}
          onManagerVoid={pos.managerVoidOrder}
          onManagerRefund={pos.managerRefundOrder}
          isOffline={state.isOffline}
          storeInfo={receiptStoreInfo}
        />
        {accountSheet}
        <UndoToast removedItem={undoRemovedItem} onUndo={pos.undoRemove} />
      </View>
    );
  }

  if (isSplit) {
    return (
      <View style={rootStyle}>
        <OfflineBanner visible={state.isOffline} />
        <NewOrderAlertBanner alert={state.newOrderAlert} onDismiss={() => pos.patch({ newOrderAlert: null })} />
        {pos.updateAvailable && (
          <UpdateBanner version={pos.updateAvailable.version} url={pos.updateAvailable.url} onDismiss={pos.dismissUpdate} />
        )}
        {state.screen === 'orderType' ? (
          <OrderTypeScreen
            variant="tablet"
            orderNumber={state.todayOrderCount + 1}
            onSelectDineIn={allowDineIn ? () => pos.selectType('dine-in') : undefined}
            onSelectTakeout={allowTakeout ? () => pos.selectType('takeout') : undefined}
          />
        ) : (
          <View style={styles.tabletMain}>
            <MenuPane
              items={pos.filteredItems}
              cartQtyByMenuId={pos.cartQtyByMenuId}
              stockByMenuId={pos.stockByMenuId}
              categories={pos.categories}
              selCat={state.selCat}
              onSelectCat={(c) => pos.patch({ selCat: c, search: '' })}
              search={state.search}
              onSearch={(v) => pos.patch({ search: v })}
              onItemPress={pos.openItem}
              queueCount={state.queue.length}
              onQueue={() => pos.patch({ showQueue: true })}
              orderTypeLabel={orderTypeLabel}
              onChangeType={() => pos.patch({ screen: 'orderType' })}
              userName={userName}
              onAccount={() => pos.patch({ showAccount: true })}
            />
            <OrderDock {...checkoutSharedProps} cartCount={pos.cartCount} />
          </View>
        )}

        {customizeProps && <CustomizeSidebar {...customizeProps} />}
        {state.success && <SuccessModal success={state.success} orderTypeLabel={orderTypeLabel} storeInfo={receiptStoreInfo} onDone={pos.done} />}
        {(state.showQueue || state.screen === 'queue') && (
          <QueueModal
            tickets={state.queue}
            onClose={() => pos.patch({ showQueue: false, screen: 'menu' })}
            onComplete={pos.completeQueueTicket}
            onFlagVoid={pos.flagVoidOrder}
            onManagerVoid={pos.managerVoidOrder}
            onSelfVoid={pos.selfVoidOrder}
            currentUser={state.currentUser}
            onAddItems={pos.startAddToOrder}
            onAdvanceItem={pos.advanceItemPrepStatus}
            isOffline={state.isOffline}
            onOpenOutbox={pos.openOutbox}
          />
        )}
        <GcashQrModal
          visible={state.showGcashQr}
          qrUrl={state.storeSettings.gcashQrUrl}
          onClose={() => pos.patch({ showGcashQr: false })}
        />
        <QrScannerModal
          visible={state.showQrScanner}
          target={state.qrScanTarget ?? 'loyalty'}
          onScanned={pos.handleQrScanned}
          onClose={() => pos.patch({ showQrScanner: false })}
        />
        <GcashProofCameraModal
          visible={state.showGcashProofCamera}
          onCaptured={pos.handleGcashProofCaptured}
          onClose={() => pos.patch({ showGcashProofCamera: false })}
        />
        {accountSheet}
        <UndoToast removedItem={undoRemovedItem} onUndo={pos.undoRemove} />
      </View>
    );
  }

  return (
    <View style={rootStyle}>
      <OfflineBanner visible={state.isOffline} />
      <NewOrderAlertBanner alert={state.newOrderAlert} onDismiss={() => pos.patch({ newOrderAlert: null })} />
      {pos.updateAvailable && (
        <UpdateBanner version={pos.updateAvailable.version} url={pos.updateAvailable.url} onDismiss={pos.dismissUpdate} />
      )}
      {state.screen === 'orderType' && (
        <OrderTypeScreen
          variant="phone"
          orderNumber={state.todayOrderCount + 1}
          onSelectDineIn={() => pos.selectType('dine-in')}
          onSelectTakeout={() => pos.selectType('takeout')}
        />
      )}
      {state.screen === 'menu' && (
        <MenuScreen
          items={pos.filteredItems}
          cartQtyByMenuId={pos.cartQtyByMenuId}
          stockByMenuId={pos.stockByMenuId}
          categories={pos.categories}
          selCat={state.selCat}
          onSelectCat={(c) => pos.patch({ selCat: c, search: '' })}
          search={state.search}
          onSearch={(v) => pos.patch({ search: v })}
          onItemPress={pos.openItem}
          queueCount={state.queue.length}
          onQueue={() => pos.patch({ screen: 'queue' })}
          orderTypeLabel={orderTypeLabel}
          onChangeType={() => pos.patch({ screen: 'orderType' })}
          userName={userName}
          onAccount={() => pos.patch({ showAccount: true })}
          cartCount={pos.cartCount}
          cartTotal={pos.totals.total}
          onViewOrder={() => pos.patch({ screen: 'checkout' })}
        />
      )}
      {state.screen === 'checkout' && (
        <CheckoutScreen {...checkoutSharedProps} onBack={() => pos.patch({ screen: 'menu', checkoutError: null })} />
      )}
      {state.screen === 'success' && state.success && (
        <SuccessScreen success={state.success} orderTypeLabel={orderTypeLabel} storeInfo={receiptStoreInfo} onDone={pos.done} />
      )}
      {state.screen === 'queue' && (
        <QueueScreen
          tickets={state.queue}
          onBack={() => pos.patch({ screen: 'menu' })}
          onComplete={pos.completeQueueTicket}
          onFlagVoid={pos.flagVoidOrder}
          onManagerVoid={pos.managerVoidOrder}
          onSelfVoid={pos.selfVoidOrder}
          currentUser={state.currentUser}
          onAddItems={pos.startAddToOrder}
          onAdvanceItem={pos.advanceItemPrepStatus}
          isOffline={state.isOffline}
          onOpenOutbox={pos.openOutbox}
        />
      )}

      {customizeProps && <CustomizeSheet {...customizeProps} />}
      <GcashQrModal
        visible={state.showGcashQr}
        qrUrl={state.storeSettings.gcashQrUrl}
        onClose={() => pos.patch({ showGcashQr: false })}
      />
      <QrScannerModal
        visible={state.showQrScanner}
        target={state.qrScanTarget ?? 'loyalty'}
        onScanned={pos.handleQrScanned}
        onClose={() => pos.patch({ showQrScanner: false })}
      />
      <GcashProofCameraModal
        visible={state.showGcashProofCamera}
        onCaptured={pos.handleGcashProofCaptured}
        onClose={() => pos.patch({ showGcashProofCamera: false })}
      />
      {accountSheet}
      <UndoToast removedItem={undoRemovedItem} onUndo={pos.undoRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.screenBg,
    overflow: 'hidden',
  },
  tabletMain: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    minWidth: 0,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
