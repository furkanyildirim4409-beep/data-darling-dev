DROP TRIGGER IF EXISTS on_new_chat_message ON public.messages;

CREATE TRIGGER on_new_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_chat_message();