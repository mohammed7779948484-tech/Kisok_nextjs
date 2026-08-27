import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProductEditorTab = 'details' | 'variants';

type ProductEditorTabsProps = {
  activeTab: ProductEditorTab;
  details: React.ReactNode;
  onTabChange: (tab: ProductEditorTab) => void;
  variants: React.ReactNode;
};

export function ProductEditorTabs({
  activeTab,
  details,
  onTabChange,
  variants,
}: ProductEditorTabsProps) {
  return (
    <Tabs onValueChange={(value) => onTabChange(value as ProductEditorTab)} value={activeTab}>
      <TabsList aria-label="Product editor sections" variant="line">
        <TabsTrigger value="details">Product details</TabsTrigger>
        <TabsTrigger value="variants">Variants</TabsTrigger>
      </TabsList>
      <TabsContent className="mt-6" value="details">
        {details}
      </TabsContent>
      <TabsContent className="mt-6" value="variants">
        {variants}
      </TabsContent>
    </Tabs>
  );
}

export type { ProductEditorTab };
