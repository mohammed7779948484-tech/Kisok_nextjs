import { ProductEditorPage } from '@/features/product-catalog/components/ProductEditorPage';

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditorPage mode="edit" productId={id} />;
}
