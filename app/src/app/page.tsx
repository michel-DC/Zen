import CatalogManager from "@/components/admin/catalog-manager";
import MobileHome from "@/components/mobile/home";

export default function Home() {
  return <><MobileHome /><div className="hidden md:block"><CatalogManager /></div></>;
}
