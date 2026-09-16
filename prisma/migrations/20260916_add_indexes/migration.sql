-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_courseId_idx" ON "Payment"("courseId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_courseId_idx" ON "Subscription"("courseId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_nextPayment_idx" ON "Subscription"("nextPayment");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Expense_teacherId_idx" ON "Expense"("teacherId");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_courseId_idx" ON "CalendarEvent"("courseId");
CREATE INDEX "CalendarEvent_teacherId_idx" ON "CalendarEvent"("teacherId");
CREATE INDEX "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE INDEX "Evaluation_studentId_idx" ON "Evaluation"("studentId");
CREATE INDEX "Evaluation_courseId_idx" ON "Evaluation"("courseId");
CREATE INDEX "Evaluation_teacherId_idx" ON "Evaluation"("teacherId");
CREATE INDEX "Evaluation_createdAt_idx" ON "Evaluation"("createdAt");

-- CreateIndex
CREATE INDEX "TeacherSession_teacherId_idx" ON "TeacherSession"("teacherId");
CREATE INDEX "TeacherSession_date_idx" ON "TeacherSession"("date");
CREATE INDEX "TeacherSession_status_idx" ON "TeacherSession"("status");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");
CREATE INDEX "BlogPost_courseId_idx" ON "BlogPost"("courseId");
CREATE INDEX "BlogPost_published_idx" ON "BlogPost"("published");
CREATE INDEX "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");

-- CreateIndex
CREATE INDEX "BlogComment_authorId_idx" ON "BlogComment"("authorId");
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");
CREATE INDEX "BlogComment_createdAt_idx" ON "BlogComment"("createdAt");

-- CreateIndex
CREATE INDEX "ShopOrder_userId_idx" ON "ShopOrder"("userId");
CREATE INDEX "ShopOrder_status_idx" ON "ShopOrder"("status");
CREATE INDEX "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");
CREATE INDEX "ShopOrderItem_productId_idx" ON "ShopOrderItem"("productId");
