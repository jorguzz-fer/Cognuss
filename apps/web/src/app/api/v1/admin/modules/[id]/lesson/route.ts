import { z } from 'zod';
import { apiRoute, readJson, requireApiRole } from '@/lib/api';
import { attachLessonHtml } from '@/features/catalog/lesson-upload';

export const dynamic = 'force-dynamic';

const body = z.object({ fileId: z.uuid() });

// POST /api/v1/admin/modules/{id}/lesson: põe a aula pronta (arquivo .html já enviado e
// verificado pelo antivírus) no módulo em rascunho. Só admin.
export const POST = apiRoute<{ id: string }>(async ({ userId, req, params }) => {
  const roles = await requireApiRole(userId, ['admin']);
  const { fileId } = await readJson(req, body);
  const moduleId = z.uuid().parse(params.id);
  const user = { id: userId, name: '', email: '', twoFactorEnabled: true, roles };
  return attachLessonHtml(user, moduleId, fileId);
});
