import { LibraryView, type LibraryParams } from "@/components/content/LibraryView"

type Props = { searchParams: Promise<LibraryParams> }

export default async function ContentPage({ searchParams }: Props) {
  return <LibraryView params={await searchParams} scope="library" />
}
