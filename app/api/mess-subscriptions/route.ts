import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { addMonths, isValid, parseISO } from "date-fns";
import { connectToDatabase } from "@/lib/mongodb";
import { Mess } from "@/models/mess";
import { MessSubscription } from "@/models/mess-subscription";
import { getUserModel } from "@/models/user";
import { createNotification } from "@/lib/notification-helper";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import mongoose from "mongoose";

function isLocalhostUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function getBaseUrlFromRequest(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (!host) return null;
  const candidate = `${proto}://${host}`;
  if (isLocalhostUrl(candidate)) return null;
  return candidate.replace(/\/$/, "");
}

function normalizeBaseUrl(req: Request) {
  const requestBase = getBaseUrlFromRequest(req);
  if (requestBase) return requestBase;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl && !isLocalhostUrl(siteUrl)) return siteUrl.replace(/\/$/, "");

  const vercelBase = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;
  if (vercelBase && !isLocalhostUrl(vercelBase)) return vercelBase.replace(/\/$/, "");

  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase && !isLocalhostUrl(envBase)) return envBase.replace(/\/$/, "");

  // Last resort.
  return "https://secondhome.site";
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return null;
}

function getEmailTransporter() {
  const emailUser = process.env.EMAIL_USER || process.env.HOST_EMAIL;
  const emailPassword =
    process.env.EMAIL_PASSWORD || process.env.HOST_EMAIL_PASSWORD;
  if (!emailUser || !emailPassword) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword.replace(/\s/g, ""),
    },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const messId = body?.messId;
    const startDateRaw = body?.startDate;
    const subscriberPhoneRaw = body?.phone;

    if (
      !messId ||
      typeof messId !== "string" ||
      !mongoose.Types.ObjectId.isValid(messId)
    ) {
      return NextResponse.json({ error: "Invalid messId" }, { status: 400 });
    }

    if (!startDateRaw || typeof startDateRaw !== "string") {
      return NextResponse.json(
        { error: "startDate is required" },
        { status: 400 }
      );
    }

    // Expect YYYY-MM-DD from the UI.
    const startDateParsed = parseISO(startDateRaw);
    if (!isValid(startDateParsed)) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    // Normalize to UTC midnight to avoid timezone confusion.
    const startDateUtc = new Date(`${startDateRaw}T00:00:00.000Z`);
    const endDateUtc = addMonths(startDateUtc, 1);

    await connectToDatabase();

    const mess = await Mess.findById(messId).populate(
      "owner",
      "name email phone"
    );
    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 });
    }

    if (!mess.isApproved || mess.isRejected) {
      return NextResponse.json(
        { error: "Mess is not available for subscription" },
        { status: 403 }
      );
    }

    const ownerId = String((mess.owner as any)?._id ?? mess.owner);
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return NextResponse.json({ error: "Invalid owner" }, { status: 500 });
    }

    const User = await getUserModel();
    const userDoc = await User.findById(session.user.id)
      .select("name email phone")
      .lean();
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ownerDoc = await User.findById(ownerId)
      .select("name email phone")
      .lean();

    const messOwner = mess.owner as any;
    const accountOwnerName = (messOwner?.name || ownerDoc?.name || "Mess Owner") as string;
    const accountOwnerEmail = (messOwner?.email || ownerDoc?.email || "") as string;
    const accountOwnerPhone =
      normalizePhone(messOwner?.phone) || normalizePhone(ownerDoc?.phone);

    const listingContactName = String((mess as any).contactName || "").trim();
    const listingContactEmail = String((mess as any).contactEmail || "").trim();
    const listingContactPhoneRaw = String((mess as any).contactPhone || "").trim();
    const listingContactPhone = normalizePhone(listingContactPhoneRaw);

    const ownerName = listingContactName || accountOwnerName;
    const ownerEmail = listingContactEmail || accountOwnerEmail;
    const ownerPhone = listingContactPhone || accountOwnerPhone;

    const monthlyPrice = Number((mess as any).monthlyPrice);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      return NextResponse.json(
        { error: "Monthly subscription is not available for this mess" },
        { status: 400 }
      );
    }

    const subscriberPhone = normalizePhone(subscriberPhoneRaw) || normalizePhone((userDoc as any).phone);

    const subscription = await MessSubscription.create({
      user: session.user.id,
      mess: mess._id,
      owner: ownerId,
      startDate: startDateUtc,
      endDate: endDateUtc,
      monthlyPrice,
      status: "pending",
      subscriberName: (userDoc as any).name,
      subscriberEmail: (userDoc as any).email,
      subscriberPhone: subscriberPhone || undefined,
      createdAt: new Date(),
    });

    const baseUrl = normalizeBaseUrl(req);
    const messLink = `${baseUrl}/messes/${encodeURIComponent(
      String(mess._id)
    )}`;

    // In-app notifications
    await createNotification({
      userId: session.user.id,
      type: "booking",
      title: "Mess subscription created",
      message: `Your monthly subscription request for ${mess.name} has been created (start: ${startDateRaw}).`,
      link: `/messes/${String(mess._id)}`,
      priority: "high",
      metadata: {
        subscriptionId: String(subscription._id),
        messId: String(mess._id),
        startDate: startDateUtc,
        endDate: endDateUtc,
      },
    });

    if (ownerId) {
      await createNotification({
        userId: ownerId,
        type: "booking",
        title: "New mess subscription request",
        message: `${
          userDoc.name || "A user"
        } requested a monthly subscription for ${
          mess.name
        } (start: ${startDateRaw}).`,
        link: `/messes/${String(mess._id)}`,
        priority: "high",
        metadata: {
          subscriptionId: String(subscription._id),
          messId: String(mess._id),
          startDate: startDateUtc,
          endDate: endDateUtc,
        },
      });
    }

    // Email notifications
    const transporter = getEmailTransporter();
    const fromEmail = process.env.EMAIL_USER || process.env.HOST_EMAIL;
    const officialEmail =
      process.env.OFFICIAL_VERIFICATION_EMAIL ||
      process.env.ADMIN_EMAIL ||
      "second.home2k25@gmail.com";

    const userEmail = (userDoc as any).email;
    const userName = (userDoc as any).name || "User";

    if (transporter && fromEmail) {
      const subjectUser = `SecondHome: Subscription request created for ${mess.name}`;
      const subjectOwner = `SecondHome: New subscription request for ${mess.name}`;

      const userText = [
        `Hi ${userName},`,
        "",
        "Your monthly mess subscription request has been created.",
        "",
        `Mess: ${mess.name}`,
        `Start date: ${startDateRaw}`,
        `End date: ${endDateUtc.toISOString().slice(0, 10)}`,
        `Amount: ₹${monthlyPrice}/month`,
        "",
        `View mess: ${messLink}`,
        "",
        "Next steps:",
        "- The mess owner/SecondHome team will contact you to confirm and activate your subscription.",
        "",
        "Thanks,",
        "SecondHome",
      ].join("\n");

      const ownerText = [
        `Hi ${ownerName},`,
        "",
        "A new monthly subscription request has been created for your mess.",
        "",
        `Mess: ${mess.name}`,
        `User: ${userName}`,
        `User email: ${userEmail || "Not provided"}`,
        `User phone: ${subscriberPhone || "Not provided"}`,
        "",
        `Start date: ${startDateRaw}`,
        `End date: ${endDateUtc.toISOString().slice(0, 10)}`,
        `Amount: ₹${monthlyPrice}/month`,
        "",
        `Mess link: ${messLink}`,
        "",
        "Please contact the user to confirm and activate the subscription.",
        "",
        "SecondHome",
      ].join("\n");

      const officialText = [
        "New Mess Monthly Subscription Request",
        "",
        `Mess: ${mess.name} (${String(mess._id)})`,
        `Listing contact: ${ownerName} (${ownerEmail || "No email"})`,
        `Listing phone: ${ownerPhone || "Not provided"}`,
        "",
        `Account owner: ${accountOwnerName} (${accountOwnerEmail || "No email"})`,
        `Account owner phone: ${accountOwnerPhone || "Not provided"}`,
        "",
        `User: ${userName}`,
        `User email: ${userEmail || "Not provided"}`,
        `User phone: ${subscriberPhone || "Not provided"}`,
        "",
        `Start date: ${startDateRaw}`,
        `End date: ${endDateUtc.toISOString().slice(0, 10)}`,
        `Amount: ₹${monthlyPrice}/month`,
        "",
        `Subscription ID: ${String(subscription._id)}`,
        `Mess link: ${messLink}`,
      ].join("\n");

      const sendTasks: Promise<any>[] = [];

      if (userEmail) {
        sendTasks.push(
          transporter.sendMail({
            from: `"SecondHome" <${fromEmail}>`,
            to: userEmail,
            subject: subjectUser,
            text: userText,
          })
        );
      }

      if (ownerEmail) {
        sendTasks.push(
          transporter.sendMail({
            from: `"SecondHome" <${fromEmail}>`,
            to: ownerEmail,
            subject: subjectOwner,
            text: ownerText,
          })
        );
      }

      if (officialEmail) {
        sendTasks.push(
          transporter.sendMail({
            from: `"SecondHome" <${fromEmail}>`,
            to: officialEmail,
            subject: subjectOwner,
            text: officialText,
          })
        );
      }

      await Promise.allSettled(sendTasks);
    }

    return NextResponse.json(
      {
        success: true,
        subscriptionId: String(subscription._id),
        startDate: startDateUtc.toISOString(),
        endDate: endDateUtc.toISOString(),
        monthlyPrice,
        status: subscription.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mess subscription:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the subscription" },
      { status: 500 }
    );
  }
}
