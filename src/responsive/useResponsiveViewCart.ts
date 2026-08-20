import { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useBreakpoint } from '../breakpoints';

export interface ResponsiveViewCart {
  /** False on tablet — the cart (OrderDock) is already on screen, so a "View Cart" affordance
   *  has nothing to navigate to and should render nothing rather than a dead button. */
  showViewCartButton: boolean;
  /** Phone: calls onNavigateToCart. Tablet: scrolls the dock back to the top instead — same
   *  intent ("bring the cart into view"), different action because the cart's already visible. */
  onViewCart: () => void;
  /** Pass to OrderDock's ref prop on tablet. No-op on phone, where OrderDock isn't mounted. */
  dockScrollRef: React.RefObject<ScrollView | null>;
}

/**
 * Abstracts the one behavior that legitimately differs by breakpoint for a "View Cart" trigger:
 * navigate to a separate screen (phone) vs. scroll an already-visible pane into view (tablet).
 * Everything else about the cart (its contents, its mutators) comes from useCremaPos() as usual —
 * this hook only decides what an onPress handler should DO, not where the cart data lives.
 */
export function useResponsiveViewCart(onNavigateToCart: () => void): ResponsiveViewCart {
  const { isSplit } = useBreakpoint();
  const dockScrollRef = useRef<ScrollView>(null);

  const onViewCart = useCallback(() => {
    if (isSplit) {
      dockScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      onNavigateToCart();
    }
  }, [isSplit, onNavigateToCart]);

  return { showViewCartButton: !isSplit, onViewCart, dockScrollRef };
}
