import ManagePageClient from './ManagePageClient';

export default function ManagePage({ params }: { params: { namespace: string | string[] } }) {
  const rawNamespace = params.namespace;
  return <ManagePageClient rawNamespace={rawNamespace} />;
}
