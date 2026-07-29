import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AccountSheet } from './components/AccountSheet';
import { CloseShiftModal, OpenShiftModal } from './components/ShiftModal';
import { CustomizeSheet } from './components/CustomizeSheet';
import { CustomizeSidebar } from './components/CustomizeSidebar';
import { QueueModal } from './components/QueueModal';
import { SuccessModal } from './components/SuccessModal';
import { HistoryScreen } from './screens/HistoryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { MenuPane } from './screens/MenuPane';
import { MenuScreen } from './screens/MenuScreen';
import { OrderDock } from './screens/OrderDock';
import { OrderTypeScreen } from './screens/OrderTypeScreen';
import { QueueScreen } from './screens/QueueScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { colors, TABLET_BREAKPOINT } from './theme';
import { useCremaPos } from './useCremaPos';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function PosApp() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [closeShiftVisible, setCloseShiftVisible] = useState(false);

  const pos = useCremaPos();
  const { state } = pos;

  if (state.authLoading) {
    return (
      <View style={styles.root}>
        <Splash />
      </View>
    );
  }

  if (!state.currentUser) {
    return (
      <View style={styles.root}>
        <LoginScreen onLogin={pos.login} />
      </View>
    );
  }

  if (state.shiftLoading) {
    return (
      <View style={styles.root}>
        <Splash />
      </View>
    );
  }

  if (!state.shift) {
    return (
      <View style={styles.root}>
        <OpenShiftModal visible onSubmit={pos.openShiftAction} />
      </View>
    );
  }

  const currentUser = state.currentUser;
  const orderTypeLabel = state.orderType === 'dine-in' ? 'Dine-In' : 'Takeout';
  const canPay = state.cart.length > 0 && !pos.shortfall;
  const userName = currentUser.full_name;

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
    onSelectDineIn: () => pos.selectType('dine-in'),
    onSelectTakeout: () => pos.selectType('takeout'),
    discounts: pos.discounts,
    discountName: state.discountName,
    discountPct: pos.discountPct,
    onSelectDiscount: (name: string) => pos.patch({ discountName: name }),
    payMethod: state.payMethod,
    onSelectCash: () => pos.patch({ payMethod: 'cash' as const }),
    onSelectGcash: () => pos.patch({ payMethod: 'gcash' as const, tendered: '' }),
    tendered: state.tendered,
    onChangeTendered: (v: string) => pos.patch({ tendered: v }),
    quickCash: pos.quickCash,
    onQuickCash: (v: number) => pos.patch({ tendered: String(v) }),
    tenderNum: pos.tenderNum,
    change: pos.change,
    shortfall: pos.shortfall,
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
  };

  const accountSheet = (
    <>
      <AccountSheet
        visible={state.showAccount}
        user={currentUser}
        shift={state.shift}
        onClose={() => pos.patch({ showAccount: false })}
        onHistory={() => pos.patch({ showAccount: false, screen: 'history' })}
        onLock={() => { pos.patch({ showAccount: false }); pos.lockPos(); }}
        onUploadAvatar={() => { pos.patch({ showAccount: false }); pos.uploadAvatar(); }}
        onCloseShift={() => { pos.patch({ showAccount: false }); setCloseShiftVisible(true); }}
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
    </>
  );

  if (state.screen === 'history') {
    return (
      <View style={styles.root}>
        <HistoryScreen
          onBack={() => pos.patch({ screen: 'menu' })}
          onFlagVoid={pos.flagVoidOrder}
          onManagerVoid={pos.managerVoidOrder}
          isOffline={state.isOffline}
        />
        {accountSheet}
      </View>
    );
  }

  if (isTablet) {
    return (
      <View style={styles.root}>
        {state.screen === 'orderType' ? (
          <OrderTypeScreen
            variant="tablet"
            onSelectDineIn={() => pos.selectType('dine-in')}
            onSelectTakeout={() => pos.selectType('takeout')}
          />
        ) : (
          <View style={styles.tabletMain}>
            <MenuPane
              items={pos.filteredItems}
              cartQtyByMenuId={pos.cartQtyByMenuId}
              stockByMenuId={pos.stockByMenuId}
              categories={pos.categories}
              selCat={state.selCat}
              onSelectCat={(c) => pos.patch({ selCat: c })}
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
        {state.success && <SuccessModal success={state.success} orderTypeLabel={orderTypeLabel} onDone={pos.done} />}
        {state.showQueue && (
          <QueueModal
            tickets={state.queue}
            onClose={() => pos.patch({ showQueue: false })}
            onComplete={pos.completeQueueTicket}
            onFlagVoid={pos.flagVoidOrder}
            onManagerVoid={pos.managerVoidOrder}
            isOffline={state.isOffline}
          />
        )}
        {accountSheet}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {state.screen === 'orderType' && (
        <OrderTypeScreen
          variant="phone"
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
          onSelectCat={(c) => pos.patch({ selCat: c })}
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
        <CheckoutScreen {...checkoutSharedProps} onBack={() => pos.patch({ screen: 'menu' })} />
      )}
      {state.screen === 'success' && state.success && (
        <SuccessScreen success={state.success} orderTypeLabel={orderTypeLabel} onDone={pos.done} />
      )}
      {state.screen === 'queue' && (
        <QueueScreen
          tickets={state.queue}
          onBack={() => pos.patch({ screen: 'menu' })}
          onComplete={pos.completeQueueTicket}
          onFlagVoid={pos.flagVoidOrder}
          onManagerVoid={pos.managerVoidOrder}
          isOffline={state.isOffline}
        />
      )}

      {customizeProps && <CustomizeSheet {...customizeProps} />}
      {accountSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  tabletMain: {
    flex: 1,
    flexDirection: 'row',
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
