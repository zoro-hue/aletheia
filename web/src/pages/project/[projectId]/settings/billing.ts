import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProjectBillingRedirect() {
  const router = useRouter();
  const projectId = router.query.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/project/${projectId}/settings`);
    }
  }, [projectId, router]);

  return "Redirecting...";
}
