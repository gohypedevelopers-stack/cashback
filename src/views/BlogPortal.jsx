"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router";
import { ArrowLeft, LogIn, Newspaper, Plus, Upload, Save } from "lucide-react";
import AuthImage from "../components/AuthImage";
import BlogContentToolbar from "../components/admin/BlogContentToolbar";
import {
  loginBlogTeam,
  saveBlogTeamPosts,
  uploadBlogTeamImage,
} from "../lib/api";
import { getApiBaseUrl } from "../lib/apiClient";

const API_BASE_URL = getApiBaseUrl();

const inputClass =
  "w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] transition-colors";
const primaryButtonClass =
  "px-5 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-lg shadow-[#059669]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed";
const ghostButtonClass =
  "px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 font-medium transition-colors";

const createBlogDraft = () => {
  const timestamp = Date.now();
  return {
    id: `blog-${timestamp}`,
    title: "",
    slug: `draft-${timestamp}`,
    excerpt: "",
    author: "",
    category: "",
    coverImage: "",
    coverImageAlt: "",
    content: "",
    status: "draft",
    publishedAt: "",
  };
};

const resolveAssetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  return value;
};

const normalizeBlogs = (blogs) =>
  Array.isArray(blogs)
    ? blogs.map((blog, index) => ({
        id: String(blog?.id || `blog-${index + 1}`),
        title: String(blog?.title || ""),
        slug: String(blog?.slug || ""),
        excerpt: String(blog?.excerpt || ""),
        author: String(blog?.author || ""),
        category: String(blog?.category || ""),
        coverImage: String(blog?.coverImage || blog?.image || ""),
        coverImageAlt: String(blog?.coverImageAlt || blog?.imageAlt || ""),
        content: String(blog?.content || ""),
        status:
          String(blog?.status || "draft").toLowerCase() === "published"
            ? "published"
            : "draft",
        publishedAt: String(blog?.publishedAt || ""),
      }))
    : [];

const formatLinkUrl = (url) => {
  if (!url) return "#";
  let trimmed = String(url).trim();
  trimmed = trimmed.replace(/^https?:\/\/(https?:\/\/)/i, "$1");
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const parseInlineMarkdown = (text) => {
  if (!text) return "";

  // Check if it's an alignment paragraph tag
  const alignMatch = text.match(/^<p style="text-align:(left|center|right)">(.*?)<\/p>$/i);
  if (alignMatch) {
    const [, alignment, innerText] = alignMatch;
    const alignClass = 
      alignment === "center" ? "text-center" : 
      alignment === "right" ? "text-right" : "text-left";
    return (
      <span className={`block w-full ${alignClass}`}>
        {parseInlineMarkdown(innerText)}
      </span>
    );
  }

  // Tokenize inline code, links, bold, italic, and strikethrough
  const regex = /(`[^`]+`|\[.*?\]\(.*?\)|\*\*.*?\*\*|__.*?__|~~.*?~~|\*.*?\*|_.*?_)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-400 font-mono text-[13px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={formatLinkUrl(linkMatch[2])}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-emerald-600 hover:text-emerald-700 underline font-semibold transition-colors"
        >
          {parseInlineMarkdown(linkMatch[1])}
        </a>
      );
    }

    // Bold
    if ((part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
        (part.startsWith("__") && part.endsWith("__") && part.length >= 4)) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {parseInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic
    if ((part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
        (part.startsWith("_") && part.endsWith("_") && part.length >= 2)) {
      return (
        <em key={index} className="italic">
          {parseInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    // Strike
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={index} className="line-through text-slate-400">
          {parseInlineMarkdown(part.slice(2, -2))}
        </del>
      );
    }

    // Plain text
    return part;
  });
};

const parseMarkdownBlocks = (content) => {
  if (!content) return [];
  const rawLines = String(content || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Code block (```)
    if (trimmed.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++;
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    // 3. Horizontal rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 4. Markdown Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({ type: "image", alt: imgMatch[1], url: imgMatch[2] });
      i++;
      continue;
    }

    // 5. Headings (# to ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({ type: "heading", level, text: headingMatch[2] });
      i++;
      continue;
    }

    // 6. Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // 7. Table: lines starting with | and ending with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
        tableLines.push(rawLines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (rowStr) =>
          rowStr
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(tableLines[1]);
        const startRowIdx = isSeparator ? 2 : 1;
        const rows = tableLines.slice(startRowIdx).map(parseRow);

        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    // 8. Unordered list (*, -, +)
    if (/^[\*\-\+]\s+/.test(trimmed)) {
      const items = [];
      while (i < rawLines.length && /^[\*\-\+]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[\*\-\+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // 9. Ordered list (1. , 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < rawLines.length && /^\d+\.\s+/.test(rawLines[i].trim())) {
        const itemMatch = rawLines[i].trim().match(/^(\d+)\.\s+(.+)$/);
        if (itemMatch) {
          items.push({ num: itemMatch[1], text: itemMatch[2] });
        } else {
          items.push({ num: String(items.length + 1), text: rawLines[i].trim().replace(/^\d+\.\s+/, "") });
        }
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // 10. Default: Paragraph
    const paragraphLines = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith("#") &&
      !rawLines[i].trim().startsWith(">") &&
      !rawLines[i].trim().startsWith("```") &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(rawLines[i].trim()) &&
      !/^!\[(.*?)\]\((.*?)\)$/.test(rawLines[i].trim()) &&
      !(rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) &&
      !/^[\*\-\+]\s+/.test(rawLines[i].trim()) &&
      !/^\d+\.\s+/.test(rawLines[i].trim())
    ) {
      paragraphLines.push(rawLines[i]);
      i++;
    }
    blocks.push({ type: "p", text: paragraphLines.join("\n") });
  }

  return blocks;
};

const renderPreviewBlocks = (content) => {
  const blocks = parseMarkdownBlocks(content);
  return blocks.map((block, index) => {
    const key = `prev-${index}`;
    switch (block.type) {
      case "heading": {
        if (block.level === 1) {
          return (
            <h1 key={key} className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-7 mb-4 leading-tight">
              {parseInlineMarkdown(block.text)}
            </h1>
          );
        }
        if (block.level === 2) {
          return (
            <h2 key={key} className="text-xl sm:text-2xl font-bold text-slate-900 mt-6 mb-3 leading-snug border-b border-slate-100 pb-2">
              {parseInlineMarkdown(block.text)}
            </h2>
          );
        }
        if (block.level === 3) {
          return (
            <h3 key={key} className="text-lg sm:text-xl font-bold text-slate-800 mt-5 mb-2.5 leading-snug">
              {parseInlineMarkdown(block.text)}
            </h3>
          );
        }
        if (block.level === 4) {
          return (
            <h4 key={key} className="text-base sm:text-lg font-bold text-slate-800 mt-4 mb-2">
              {parseInlineMarkdown(block.text)}
            </h4>
          );
        }
        if (block.level === 5) {
          return (
            <h5 key={key} className="text-sm sm:text-base font-semibold text-slate-800 mt-3 mb-1.5">
              {parseInlineMarkdown(block.text)}
            </h5>
          );
        }
        return (
          <h6 key={key} className="text-xs sm:text-sm font-semibold text-slate-700 mt-3 mb-1">
            {parseInlineMarkdown(block.text)}
          </h6>
        );
      }
      case "ul": {
        return (
          <ul key={key} className="my-3.5 space-y-2 pl-1">
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2.5 text-[15px] text-slate-700 leading-relaxed">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5 text-base leading-none">•</span>
                <div className="flex-1">{parseInlineMarkdown(item)}</div>
              </li>
            ))}
          </ul>
        );
      }
      case "ol": {
        return (
          <ol key={key} className="my-3.5 space-y-2 pl-1">
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2.5 text-[15px] text-slate-700 leading-relaxed">
                <span className="font-bold text-emerald-600 text-sm shrink-0 min-w-[20px]">
                  {item.num}.
                </span>
                <div className="flex-1">{parseInlineMarkdown(item.text)}</div>
              </li>
            ))}
          </ol>
        );
      }
      case "table": {
        return (
          <div key={key} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {block.headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-bold text-slate-900 tracking-tight">
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-slate-700 leading-relaxed">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "blockquote": {
        return (
          <blockquote key={key} className="my-4 border-l-4 border-emerald-500 bg-emerald-50/40 px-4 py-3 italic text-[15px] text-slate-700 rounded-r-xl leading-relaxed">
            {parseInlineMarkdown(block.text)}
          </blockquote>
        );
      }
      case "image": {
        return (
          <div key={key} className="my-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
            <img
              src={resolveAssetUrl(block.url)}
              alt={block.alt || "Blog image"}
              className="w-full h-auto max-h-[450px] object-cover"
            />
            {block.alt && (
              <p className="text-center text-xs text-slate-500 py-2 px-4 bg-slate-100/50 border-t border-slate-200 italic">
                {block.alt}
              </p>
            )}
          </div>
        );
      }
      case "code": {
        return (
          <pre key={key} className="my-4 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
            <code>{block.content}</code>
          </pre>
        );
      }
      case "hr": {
        return <hr key={key} className="my-6 border-slate-200" />;
      }
      case "p":
      default: {
        return (
          <p key={key} className="mb-4 leading-7 text-slate-700 text-[15px]">
            {parseInlineMarkdown(block.text)}
          </p>
        );
      }
    }
  });
};

const BlogPortal = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const textareaRefs = useRef({});
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isAuthed, setIsAuthed] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [uploadState, setUploadState] = useState({});

  // Sync editingBlogId from URL slug
  useEffect(() => {
    if (blogs.length > 0) {
      if (slug) {
        const currentEditing = blogs.find((b) => b.id === editingBlogId);
        if (currentEditing) {
          if (currentEditing.slug !== slug) {
            navigate(`/blog-edit/${currentEditing.slug}`, { replace: true });
          }
          return;
        }

        const found = blogs.find((b) => b.slug === slug);
        if (found) {
          setEditingBlogId(found.id);
        } else {
          setEditingBlogId(null);
          navigate("/blog-edit", { replace: true });
        }
      } else {
        setEditingBlogId(null);
      }
    } else {
      setEditingBlogId(null);
    }
  }, [slug, blogs, navigate, editingBlogId]);

  const blogCount = useMemo(() => blogs.length, [blogs]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("blog_email");
    const savedPassword = localStorage.getItem("blog_password");
    if (savedEmail && savedPassword) {
      setCredentials({ email: savedEmail, password: savedPassword });
      const performAutoLogin = async () => {
        setIsAutoLoggingIn(true);
        setError("");
        try {
          const data = await loginBlogTeam(savedEmail, savedPassword);
          setBlogs(normalizeBlogs(data?.blogs));
          setIsAuthed(true);
        } catch (err) {
          localStorage.removeItem("blog_email");
          localStorage.removeItem("blog_password");
          setError("Session expired. Please sign in again.");
        } finally {
          setIsAutoLoggingIn(false);
        }
      };
      performAutoLogin();
    }
  }, []);

  const handleCredentialChange = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    try {
      const data = await loginBlogTeam(credentials.email, credentials.password);
      localStorage.setItem("blog_email", credentials.email);
      localStorage.setItem("blog_password", credentials.password);
      setBlogs(normalizeBlogs(data?.blogs));
      setIsAuthed(true);
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlogChange = (index, field, value) => {
    setBlogs((prev) =>
      prev.map((blog, idx) => {
        if (idx === index) {
          const updated = { ...blog, [field]: value };
          if (field === "title") {
            updated.slug = value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
          }
          return updated;
        }
        return blog;
      }),
    );
  };

  const handleAddBlog = () => {
    const newBlog = createBlogDraft();
    setBlogs((prev) => [newBlog, ...prev]);
    navigate(`/blog-edit/${newBlog.slug}`);
  };

  const handleRemoveBlog = (index) => {
    const blogToRemove = blogs[index];
    setBlogs((prev) => prev.filter((_, idx) => idx !== index));
    if (slug && blogToRemove && blogToRemove.slug === slug) {
      navigate("/blog-edit");
    }
  };

  const handleUpload = async (index, file) => {
    if (!file) return;
    setUploadState((prev) => ({
      ...prev,
      [index]: { status: "Uploading...", error: "" },
    }));
    try {
      const data = await uploadBlogTeamImage(
        credentials.email,
        credentials.password,
        file,
      );
      if (!data?.url) throw new Error("Upload failed. No URL returned.");
      handleBlogChange(index, "coverImage", data.url);
      setUploadState((prev) => ({
        ...prev,
        [index]: { status: "Cover image uploaded.", error: "" },
      }));
    } catch (err) {
      setUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: err.message || "Upload failed." },
      }));
    }
  };

  const handleSave = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);
    try {
      const data = await saveBlogTeamPosts(
        credentials.email,
        credentials.password,
        blogs,
      );
      setBlogs(normalizeBlogs(data?.blogs));
      setMessage("Blogs saved.");
    } catch (err) {
      setError(err.message || "Unable to save blogs.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoLoggingIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#059669] border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-600">Signing in automatically...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Newspaper size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Blog Upload</h1>
              <p className="text-sm text-slate-500">Sign in with blog team access.</p>
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}
          {message && <div className="text-sm text-emerald-600">{message}</div>}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Email ID</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => handleCredentialChange("email", e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => handleCredentialChange("password", e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`${primaryButtonClass} w-full flex items-center justify-center gap-2`}
          >
            <LogIn size={16} /> {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blog Upload</h1>
            <p className="text-sm text-slate-500">{blogCount} post{blogCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleAddBlog} className={`${primaryButtonClass} flex items-center gap-2`}>
              <Plus size={16} /> Add Blog
            </button>
            <button type="button" onClick={handleSave} disabled={isLoading} className={ghostButtonClass}>
              {isLoading ? "Saving..." : "Save Blogs"}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("blog_email");
                localStorage.removeItem("blog_password");
                setIsAuthed(false);
                setCredentials({ email: "", password: "" });
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-sm text-slate-700 font-medium transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {message && <div className="text-sm text-emerald-600">{message}</div>}

        {blogs.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <Newspaper className="mx-auto mb-3 text-slate-400" size={30} />
            <p className="text-sm font-semibold">No blogs added yet</p>
          </div>
        )}

        {editingBlogId ? (
          (() => {
            const blog = blogs.find((b) => b.id === editingBlogId);
            const index = blogs.findIndex((b) => b.id === editingBlogId);
            if (!blog) return null;
            return (
              <section key={blog.id} className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/blog-edit")}
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#059669] hover:underline cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back to Blogs
                  </button>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {blog.status === "published" ? "Published Post" : "Edit Post"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to remove this post?")) {
                          handleRemoveBlog(index);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_420px] gap-5 items-start">
                  <div className="space-y-4">
                    <input
                      value={blog.title}
                      onChange={(e) => handleBlogChange(index, "title", e.target.value)}
                      className={`${inputClass} font-semibold`}
                      placeholder="Post title"
                    />
                    <textarea
                      rows={3}
                      value={blog.excerpt}
                      onChange={(e) => handleBlogChange(index, "excerpt", e.target.value)}
                      className={inputClass}
                      placeholder="Short post excerpt"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={blog.status}
                        onChange={(e) => handleBlogChange(index, "status", e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#059669] transition-colors w-40 cursor-pointer shadow-sm hover:border-slate-300"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-md shadow-[#059669]/10 transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                      >
                        <Save size={15} />
                        {isLoading ? "Saving..." : "Save Post"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="aspect-[4/1.25] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {blog.coverImage ? (
                        <AuthImage src={resolveAssetUrl(blog.coverImage)} alt={blog.coverImageAlt || blog.title || "Blog cover preview"} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No cover image</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <label className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 flex items-center justify-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleUpload(index, file);
                            e.target.value = "";
                          }}
                        />
                        <Upload size={14} /> Upload Image
                      </label>
                      {blog.coverImage && (
                        <button
                          type="button"
                          onClick={() => handleBlogChange(index, "coverImage", "")}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>Image ALT Text</span>
                        <span className="text-[10px] text-slate-400 font-normal">SEO & Accessibility</span>
                      </label>
                      <input
                        type="text"
                        value={blog.coverImageAlt || ""}
                        onChange={(e) => handleBlogChange(index, "coverImageAlt", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] transition-colors"
                        placeholder="e.g. Customer loyalty reward card benefits"
                      />
                    </div>
                    {uploadState[index]?.status && <p className="text-center text-[11px] text-emerald-600">{uploadState[index].status}</p>}
                    {uploadState[index]?.error && <p className="text-center text-[11px] text-rose-600">{uploadState[index].error}</p>}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-200">
                      <BlogContentToolbar
                        value={blog.content}
                        onChange={(value) => handleBlogChange(index, "content", value)}
                        textareaRef={{ get current() { return textareaRefs.current[index]; } }}
                      />
                      <span className="px-4 text-xs font-semibold text-slate-500">
                        Preview
                      </span>
                    </div>
                    <div className="grid lg:grid-cols-2 min-h-[520px]">
                      <textarea
                        ref={(el) => (textareaRefs.current[index] = el)}
                        value={blog.content}
                        onChange={(e) => handleBlogChange(index, "content", e.target.value)}
                        className="min-h-[520px] w-full resize-y border-0 border-r border-slate-200 bg-white p-6 font-mono text-sm leading-7 text-slate-900 outline-none"
                        placeholder="# Start writing your blog post..."
                      />
                      <div className="min-h-[520px] overflow-y-auto bg-white">
                        <div className="border-b border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Preview
                        </div>
                        <article className="p-8 text-slate-900">
                          {blog.content ? (
                            renderPreviewBlocks(blog.content)
                          ) : (
                            <p className="text-sm text-slate-400">
                              Your formatted preview will appear here.
                            </p>
                          )}
                        </article>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {blogs.map((blog, index) => {
              const displayDate = blog.publishedAt || new Date().toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
              return (
                <div
                  key={blog.id || index}
                  onClick={() => navigate(`/blog-edit/${blog.slug}`)}
                  className="bg-white dark:bg-[#131317] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col h-full group animate-in fade-in duration-300"
                >
                  <div className="aspect-[2/1] bg-slate-50 dark:bg-black/40 overflow-hidden relative border-b border-slate-100 dark:border-white/5 flex items-center justify-center">
                    {blog.coverImage ? (
                      <AuthImage
                        src={resolveAssetUrl(blog.coverImage)}
                        alt={blog.coverImageAlt || blog.title || "Blog cover"}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-slate-300 dark:text-zinc-700 flex flex-col items-center gap-1.5">
                        <Newspaper size={24} />
                        <span className="text-[10px] font-medium tracking-wide">No cover image</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        blog.status === "published"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-100 dark:border-amber-500/20"
                      }`}>
                        {blog.status || "draft"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      <span>{blog.author || "Admin"}</span>
                      <span>{displayDate}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-850 dark:text-white leading-snug group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition-colors line-clamp-2 mb-1.5">
                      {blog.title || "Untitled Post"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3 flex-1">
                      {blog.excerpt || "No description provided."}
                    </p>
                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[#059669] dark:text-emerald-400">
                        Edit post &rarr;
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to remove this post?")) {
                            handleRemoveBlog(index);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-775 dark:text-rose-400 dark:hover:text-rose-300 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 py-1 rounded-md cursor-pointer"
                        title="Delete post"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPortal;
