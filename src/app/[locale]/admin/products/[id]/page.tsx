import { ProductEditorPage } from '@/features/product-catalog/components/ProductEditorPage';

export default async function ProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditorPage mode="show" productId={id} />;
}
