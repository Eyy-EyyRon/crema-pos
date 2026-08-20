import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '../breakpoints';

// The detail pane gets a fixed width and the master/list pane stays flexible — that's what
// keeps the split usable. Making the detail pane flex:1 too just gives it a 50/50 split
// instead of letting the list use the room it actually needs.
const ORDER_DOCK_WIDTH = 384;

export interface OrderScreenProps {
  /** Which single-column screen to show on phone. Ignored on tablet — both panes are always
   *  visible there. */
  screen: 'menu' | 'cart';
  onSelectItem: (id: string) => void;
  onCheckout: () => void;
  cartCount: number;
}

export function OrderScreen(props: OrderScreenProps) {
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();

  // Only the outer edges need the inset — an inner ScrollView's own content padding still
  // applies on top of this, it isn't a substitute for it.
  const edgePadding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (isTablet) {
    return (
      <View style={[styles.root, styles.tabletRoot, edgePadding]}>
        <MenuPane onSelectItem={props.onSelectItem} style={styles.menuPane} />
        <OrderDock onCheckout={props.onCheckout} cartCount={props.cartCount} style={styles.orderDock} />
      </View>
    );
  }

  return (
    <View style={[styles.root, edgePadding]}>
      {props.screen === 'cart'
        ? <CartScreen onCheckout={props.onCheckout} cartCount={props.cartCount} />
        : <MenuScreen onSelectItem={props.onSelectItem} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabletRoot: {
    flexDirection: 'row',
  },
  menuPane: {
    flex: 1,
    minWidth: 0, // lets the pane actually shrink below its content width instead of overflowing
  },
  orderDock: {
    width: ORDER_DOCK_WIDTH,
    flexShrink: 0,
  },
});

// ─────────────────────────────────────────────────────────────────────────
// Placeholder screens/panes — swap these four for your app's real components.
// They exist here only so this file is self-contained and type-checks on its own;
// the responsive logic above (useBreakpoint + fixed-width detail pane + safe-area
// edge padding) is the part meant to survive the swap unchanged.
// ─────────────────────────────────────────────────────────────────────────

function MenuScreen({ onSelectItem }: { onSelectItem: (id: string) => void }) {
  return <View style={styles.root}><Text onPress={() => onSelectItem('demo-item')}>Menu (phone)</Text></View>;
}

function CartScreen({ onCheckout, cartCount }: { onCheckout: () => void; cartCount: number }) {
  return <View style={styles.root}><Text onPress={onCheckout}>Cart ({cartCount}) — phone</Text></View>;
}

function MenuPane({ onSelectItem, style }: { onSelectItem: (id: string) => void; style?: object }) {
  return <View style={style}><Text onPress={() => onSelectItem('demo-item')}>Menu (tablet pane)</Text></View>;
}

function OrderDock({ onCheckout, cartCount, style }: { onCheckout: () => void; cartCount: number; style?: object }) {
  return <View style={style}><Text onPress={onCheckout}>Order Dock ({cartCount})</Text></View>;
}
