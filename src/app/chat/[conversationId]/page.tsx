import { ChatPlaceholder } from "@/features/auth/components/chat-placeholder";

type SelectedConversationPageProps = Readonly<{
  params: Promise<{
    conversationId: string;
  }>;
}>;

export default async function SelectedConversationPage({
  params,
}: SelectedConversationPageProps) {
  const { conversationId } = await params;

  return <ChatPlaceholder selectedConversationId={conversationId} />;
}
