import { useEffect, useRef } from 'react';

// Ensure the Shopify Buy SDK is loaded only once
let sdkLoading: Promise<void> | null = null;

function loadShopifySdk(): Promise<void> {
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise((resolve) => {
    if ((window as any).ShopifyBuy) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return sdkLoading;
}

interface ShopifyBuyButtonProps {
  /** HTML id for the container element. Leave default unless multiple buttons rendered. */
  containerId?: string;
  /** Generated image URL to attach to checkout */
  imageUrl?: string | null;
}

export default function ShopifyBuyButton({ containerId = 'shopify-product-9720675664174', imageUrl }: ShopifyBuyButtonProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    loadShopifySdk().then(() => {
      const ShopifyBuy = (window as any).ShopifyBuy;
      if (!ShopifyBuy?.UI) return;

      const client = ShopifyBuy.buildClient({
        domain: 'kysyra-xx.myshopify.com',
        storefrontAccessToken: '0e5cc034d0584eddc19ae6c1fbe1c937',
      });

      ShopifyBuy.UI.onReady(client).then((ui: any) => {
        const component = ui.createComponent('product', {
          id: '9720675664174',
          node: ref.current,
          moneyFormat: '%24%7B%7Bamount%7D%7D',
          options: {
            product: {
              buttonDestination: 'checkout',
              text: { button: 'Buy now' },
              contents: {
                img: false,
                imgWithCarousel: false,
              },
              styles: {
                title: { color: '#cc7070', fontSize: '19px', fontWeight: 'normal' },
                product: { textAlign: 'left' },
              },
            },
            cart: { text: { total: 'Subtotal', button: 'Checkout' } },
            modalProduct: { text: { button: 'Add to cart' } },
          },
        });

        // Listen for checkout and append image URL as note param
        ui.on('checkout', async (payload: any) => {
          if (!imageUrl) return;
          try {
            await client.checkout.updateAttributes(payload.checkout.id, { note: imageUrl });
          } catch (e) {
            console.warn('Failed to attach note', e);
          }
        });
      });
    });
  }, []);

  return <div id={containerId} ref={ref} className="w-full" />;
}
