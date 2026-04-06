"use client";

import { useAuthStore } from "@/store/authStore";

export default function MyPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <div>사용자 정보를 불러오는 중입니다.</div>;
  }

  return (
    <div>
      <h1>마이페이지</h1>
      <p>user_id: {user.user_id}</p>
      <p>email: {user.email}</p>
      <p>nickname: {user.nickname}</p>
      <p>social_type: {user.social_type}</p>
    </div>
  );
}
