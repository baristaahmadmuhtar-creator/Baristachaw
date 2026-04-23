import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { genId, normalizeSearchValue } from '@baristaclaw/shared';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  AppShell,
  BottomActionDock,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
  SegmentedControl,
} from '../design-system';
import { trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import {
  createCollectionFolder,
  listCollectionFolders,
  listCollectionItems,
  moveCollectionItem,
  renameCollectionFolder,
  saveCollectionItem,
  softDeleteCollectionFolder,
  softDeleteCollectionItem,
} from '../services/mobileStore';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import type { AuthSession, CollectionFolderRecord, CollectionItemRecord } from '../types';
import { getMobileLocalization } from '../utils/localization';

type FilterType = 'all' | 'recipe' | 'ai_canvas' | 'note';

type CollectionScreenProps = {
  session?: AuthSession | null;
  guestModeEnabled?: boolean;
};

function isNote(item: CollectionItemRecord): item is CollectionItemRecord & { type: 'ai_canvas'; content: { markdown: string; kind?: string } } {
  return item.type === 'ai_canvas' && item.content?.kind === 'note';
}

function buildCollectionPreview(item: CollectionItemRecord, emptyLabel: string): string {
  const raw = item.type === 'recipe'
    ? `${item.content.description || ''} ${(item.content.steps || []).join(' ')}`
    : item.content.markdown || '';
  const compact = raw.replace(/\s+/g, ' ').trim();
  if (!compact) return emptyLabel;
  return compact.length > 150 ? `${compact.slice(0, 147).trim()}...` : compact;
}

export function CollectionScreen({ session = null, guestModeEnabled = false }: CollectionScreenProps) {
  const preferredLanguage = usePreferredMobileLanguage(session?.user.id);
  const { direction, language, locale, web: webT } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const isRtl = direction === 'rtl';
  const isFocused = useIsFocused();
  const [items, setItems] = useState<CollectionItemRecord[]>([]);
  const [folders, setFolders] = useState<CollectionFolderRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [listError, setListError] = useState('');

  const [detailItem, setDetailItem] = useState<CollectionItemRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMarkdown, setNoteMarkdown] = useState('');
  const [noteFolderId, setNoteFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState('');
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const filterItems = useMemo(() => ([
    { value: 'all' as const, label: webT.allItems },
    { value: 'recipe' as const, label: webT.recipes },
    { value: 'ai_canvas' as const, label: webT.aiCanvas },
    { value: 'note' as const, label: webT.notes },
  ]), [webT.aiCanvas, webT.allItems, webT.notes, webT.recipes]);
  const copy = useMemo(() => {
    if (language === 'zh') {
      return {
        filterTitle: '筛选',
        filterSubtitle: '搜索并缩小列表范围。',
        foldersTitle: '文件夹',
        browseOnly: '仅浏览。',
        tidyFolders: '使用文件夹保持条目整洁。',
        uncategorized: '未分类',
        folderFallback: '文件夹',
        recipe: '配方',
        note: '笔记',
        canvas: '画布',
        updated: '已更新',
        emptyTitle: '这里还没有内容',
        emptyPreview: '还没有预览。',
        share: '分享',
        moveToFolder: '移动到文件夹',
        noteSubtitle: '保持简短并有用。',
        noteBodyPlaceholder: '编写 markdown 笔记...',
        folderLabel: '文件夹',
        organizeLibrary: '保持资料库整洁。',
        newFolder: '新建文件夹',
        add: '添加',
        items: '项',
        rename: '重命名',
        delete: '删除',
        renameFolder: '重命名文件夹',
        selectFolderHint: '在页面中选择一个文件夹标签，以便在这里重命名或删除。',
        tip: '提示',
        selectFolderTip: '在页面中选择一个文件夹标签来管理它。',
        createFolderHint: '你仍然可以在这个面板中创建新文件夹。',
        emptySearch: '没有匹配当前搜索的已保存内容。',
        emptyUncategorized: '还没有未分类内容。',
        emptyFolder: '这个文件夹里还没有已保存内容。',
        readOnlyBody: '已保存内容仍会显示在这里。登录后可编辑。',
        emptyDefault: '还没有已保存内容。可从首页、聊天或扫描中保存。',
        quickNote: '快速笔记',
        recipeItem: '配方条目',
        loadError: '目前无法加载 Collection。',
        updateError: '目前无法更新 Collection。',
      };
    }
    if (language === 'ja') {
      return {
        filterTitle: 'フィルター',
        filterSubtitle: '検索して一覧を絞り込みます。',
        foldersTitle: 'フォルダー',
        browseOnly: '閲覧のみ。',
        tidyFolders: 'フォルダーで項目を整理します。',
        uncategorized: '未分類',
        folderFallback: 'フォルダー',
        recipe: 'レシピ',
        note: 'ノート',
        canvas: 'キャンバス',
        updated: '更新済み',
        emptyTitle: 'まだ何もありません',
        emptyPreview: 'まだプレビューはありません。',
        share: '共有',
        moveToFolder: 'フォルダーへ移動',
        noteSubtitle: '短く、役立つ内容にしてください。',
        noteBodyPlaceholder: 'Markdown ノートを書く...',
        folderLabel: 'フォルダー',
        organizeLibrary: 'ライブラリを整理します。',
        newFolder: '新しいフォルダー',
        add: '追加',
        items: '件',
        rename: '名前を変更',
        delete: '削除',
        renameFolder: 'フォルダー名を変更',
        selectFolderHint: 'ページ上のフォルダーチップを選ぶと、ここで名前変更または削除できます。',
        tip: 'ヒント',
        selectFolderTip: 'ページ上のフォルダーチップを選んで管理してください。',
        createFolderHint: 'このシートから新しいフォルダーを作成できます。',
        emptySearch: 'この検索に一致する保存済みアイテムはありません。',
        emptyUncategorized: '未分類のアイテムはまだありません。',
        emptyFolder: 'このフォルダーに保存済みアイテムはありません。',
        readOnlyBody: '保存済みアイテムはここに表示されます。編集にはサインインが必要です。',
        emptyDefault: '保存済みアイテムはまだありません。ホーム、チャット、またはスキャンから保存してください。',
        quickNote: 'クイックノート',
        recipeItem: 'レシピ項目',
        loadError: '現在 Collection を読み込めません。',
        updateError: '現在 Collection を更新できません。',
      };
    }
    if (language === 'ko') {
      return {
        filterTitle: '필터',
        filterSubtitle: '검색하고 목록 범위를 좁히세요.',
        foldersTitle: '폴더',
        browseOnly: '보기 전용.',
        tidyFolders: '폴더로 항목을 정리하세요.',
        uncategorized: '미분류',
        folderFallback: '폴더',
        recipe: '레시피',
        note: '노트',
        canvas: '캔버스',
        updated: '업데이트됨',
        emptyTitle: '아직 아무것도 없습니다',
        emptyPreview: '아직 미리보기가 없습니다.',
        share: '공유',
        moveToFolder: '폴더로 이동',
        noteSubtitle: '짧고 유용하게 유지하세요.',
        noteBodyPlaceholder: '마크다운 노트 작성...',
        folderLabel: '폴더',
        organizeLibrary: '라이브러리를 정리하세요.',
        newFolder: '새 폴더',
        add: '추가',
        items: '개',
        rename: '이름 변경',
        delete: '삭제',
        renameFolder: '폴더 이름 변경',
        selectFolderHint: '페이지에서 폴더 칩을 선택하면 여기서 이름을 바꾸거나 삭제할 수 있습니다.',
        tip: '팁',
        selectFolderTip: '페이지에서 폴더 칩을 선택해 관리하세요.',
        createFolderHint: '이 시트에서도 새 폴더를 만들 수 있습니다.',
        emptySearch: '검색과 일치하는 저장 항목이 없습니다.',
        emptyUncategorized: '아직 미분류 항목이 없습니다.',
        emptyFolder: '이 폴더에는 저장된 항목이 없습니다.',
        readOnlyBody: '저장된 항목은 여기서 계속 볼 수 있습니다. 편집하려면 로그인하세요.',
        emptyDefault: '아직 저장된 항목이 없습니다. 홈, 채팅 또는 스캔에서 저장하세요.',
        quickNote: '빠른 노트',
        recipeItem: '레시피 항목',
        loadError: '지금은 Collection을 불러올 수 없습니다.',
        updateError: '지금은 Collection을 업데이트할 수 없습니다.',
      };
    }
    if (language === 'th') {
      return {
        filterTitle: 'ตัวกรอง',
        filterSubtitle: 'ค้นหาและจำกัดรายการให้แคบลง',
        foldersTitle: 'โฟลเดอร์',
        browseOnly: 'ดูอย่างเดียว',
        tidyFolders: 'ใช้โฟลเดอร์เพื่อจัดระเบียบรายการ',
        uncategorized: 'ยังไม่จัดหมวด',
        folderFallback: 'โฟลเดอร์',
        recipe: 'สูตร',
        note: 'โน้ต',
        canvas: 'แคนวาส',
        updated: 'อัปเดตแล้ว',
        emptyTitle: 'ยังไม่มีอะไรที่นี่',
        emptyPreview: 'ยังไม่มีตัวอย่าง',
        share: 'แชร์',
        moveToFolder: 'ย้ายไปยังโฟลเดอร์',
        noteSubtitle: 'ให้สั้นและใช้งานได้จริง',
        noteBodyPlaceholder: 'เขียนโน้ต markdown...',
        folderLabel: 'โฟลเดอร์',
        organizeLibrary: 'จัดคลังให้เป็นระเบียบ',
        newFolder: 'โฟลเดอร์ใหม่',
        add: 'เพิ่ม',
        items: 'รายการ',
        rename: 'เปลี่ยนชื่อ',
        delete: 'ลบ',
        renameFolder: 'เปลี่ยนชื่อโฟลเดอร์',
        selectFolderHint: 'เลือกชิปโฟลเดอร์บนหน้าเพื่อเปลี่ยนชื่อหรือลบได้จากที่นี่',
        tip: 'เคล็ดลับ',
        selectFolderTip: 'เลือกชิปโฟลเดอร์บนหน้าเพื่อจัดการ',
        createFolderHint: 'คุณยังสร้างโฟลเดอร์ใหม่จากชีตนี้ได้',
        emptySearch: 'ไม่มีรายการที่บันทึกไว้ตรงกับการค้นหานี้',
        emptyUncategorized: 'ยังไม่มีรายการที่ไม่ได้จัดหมวด',
        emptyFolder: 'ยังไม่มีรายการที่บันทึกไว้ในโฟลเดอร์นี้',
        readOnlyBody: 'รายการที่บันทึกไว้ยังคงแสดงที่นี่ เข้าสู่ระบบเพื่อแก้ไข',
        emptyDefault: 'ยังไม่มีรายการที่บันทึกไว้ บันทึกจากหน้าแรก แชต หรือสแกน',
        quickNote: 'โน้ตด่วน',
        recipeItem: 'รายการสูตร',
        loadError: 'ยังไม่สามารถโหลด Collection ได้ตอนนี้',
        updateError: 'ยังไม่สามารถอัปเดต Collection ได้ตอนนี้',
      };
    }
    if (language === 'vi') {
      return {
        filterTitle: 'Bộ lọc',
        filterSubtitle: 'Tìm kiếm và thu hẹp danh sách.',
        foldersTitle: 'Thư mục',
        browseOnly: 'Chỉ xem.',
        tidyFolders: 'Dùng thư mục để giữ mọi thứ gọn gàng.',
        uncategorized: 'Chưa phân loại',
        folderFallback: 'Thư mục',
        recipe: 'Công thức',
        note: 'Ghi chú',
        canvas: 'Canvas',
        updated: 'Đã cập nhật',
        emptyTitle: 'Chưa có gì ở đây',
        emptyPreview: 'Chưa có bản xem trước.',
        share: 'Chia sẻ',
        moveToFolder: 'Chuyển vào thư mục',
        noteSubtitle: 'Giữ ngắn gọn và hữu ích.',
        noteBodyPlaceholder: 'Viết ghi chú markdown...',
        folderLabel: 'Thư mục',
        organizeLibrary: 'Giữ thư viện ngăn nắp.',
        newFolder: 'Thư mục mới',
        add: 'Thêm',
        items: 'mục',
        rename: 'Đổi tên',
        delete: 'Xóa',
        renameFolder: 'Đổi tên thư mục',
        selectFolderHint: 'Chọn một chip thư mục trên trang để đổi tên hoặc xóa tại đây.',
        tip: 'Mẹo',
        selectFolderTip: 'Chọn một chip thư mục trên trang để quản lý.',
        createFolderHint: 'Bạn vẫn có thể tạo thư mục mới từ bảng này.',
        emptySearch: 'Không có mục đã lưu nào khớp với tìm kiếm này.',
        emptyUncategorized: 'Chưa có mục nào chưa phân loại.',
        emptyFolder: 'Không có mục đã lưu trong thư mục này.',
        readOnlyBody: 'Các mục đã lưu vẫn hiển thị ở đây. Hãy đăng nhập để chỉnh sửa.',
        emptyDefault: 'Chưa có mục nào được lưu. Hãy lưu từ Trang chủ, Chat hoặc Quét.',
        quickNote: 'Ghi chú nhanh',
        recipeItem: 'Mục công thức',
        loadError: 'Hiện không thể tải Collection.',
        updateError: 'Hiện không thể cập nhật Collection.',
      };
    }
    if (language === 'ms') {
      return {
        filterTitle: 'Penapis',
        filterSubtitle: 'Cari dan sempitkan senarai.',
        foldersTitle: 'Folder',
        browseOnly: 'Lihat sahaja.',
        tidyFolders: 'Gunakan folder untuk memastikan item kemas.',
        uncategorized: 'Belum dikategorikan',
        folderFallback: 'Folder',
        recipe: 'Resipi',
        note: 'Nota',
        canvas: 'Kanvas',
        updated: 'Dikemas kini',
        emptyTitle: 'Belum ada apa-apa di sini',
        emptyPreview: 'Belum ada pratonton.',
        share: 'Kongsi',
        moveToFolder: 'Pindahkan ke folder',
        noteSubtitle: 'Pastikan ringkas dan berguna.',
        noteBodyPlaceholder: 'Tulis nota markdown...',
        folderLabel: 'Folder',
        organizeLibrary: 'Pastikan pustaka tersusun.',
        newFolder: 'Folder baharu',
        add: 'Tambah',
        items: 'item',
        rename: 'Namakan semula',
        delete: 'Padam',
        renameFolder: 'Namakan semula folder',
        selectFolderHint: 'Pilih cip folder pada halaman untuk menamakan semula atau memadamkannya di sini.',
        tip: 'Petua',
        selectFolderTip: 'Pilih cip folder pada halaman untuk menguruskannya.',
        createFolderHint: 'Anda masih boleh membuat folder baharu dari helaian ini.',
        emptySearch: 'Tiada item tersimpan yang sepadan dengan carian ini.',
        emptyUncategorized: 'Belum ada item tanpa kategori.',
        emptyFolder: 'Tiada item tersimpan dalam folder ini.',
        readOnlyBody: 'Item tersimpan kekal kelihatan di sini. Log masuk untuk mengedit.',
        emptyDefault: 'Belum ada item tersimpan. Simpan dari Laman Utama, Sembang atau Imbas.',
        quickNote: 'Nota Pantas',
        recipeItem: 'Item resipi',
        loadError: 'Collection tidak dapat dimuatkan sekarang.',
        updateError: 'Collection tidak dapat dikemas kini sekarang.',
      };
    }
    if (language === 'id') {
      return {
        filterTitle: 'Filter',
        filterSubtitle: 'Cari dan sempitkan daftar.',
        foldersTitle: 'Folder',
        browseOnly: 'Hanya lihat.',
        tidyFolders: 'Gunakan folder agar item tetap rapi.',
        uncategorized: 'Belum dikategorikan',
        folderFallback: 'Folder',
        recipe: 'Resep',
        note: 'Catatan',
        canvas: 'Canvas',
        updated: 'Diperbarui',
        emptyTitle: 'Belum ada apa-apa',
        emptyPreview: 'Belum ada pratinjau.',
        share: 'Bagikan',
        moveToFolder: 'Pindahkan ke folder',
        noteSubtitle: 'Buat singkat dan berguna.',
        noteBodyPlaceholder: 'Tulis catatan markdown...',
        folderLabel: 'Folder',
        organizeLibrary: 'Rapikan pustaka.',
        newFolder: 'Folder baru',
        add: 'Tambah',
        items: 'item',
        rename: 'Ubah nama',
        delete: 'Hapus',
        renameFolder: 'Ubah nama folder',
        selectFolderHint: 'Pilih chip folder di halaman untuk mengubah nama atau menghapusnya di sini.',
        tip: 'Tip',
        selectFolderTip: 'Pilih chip folder di halaman untuk mengelolanya.',
        createFolderHint: 'Anda tetap bisa membuat folder baru dari sheet ini.',
        emptySearch: 'Tidak ada item tersimpan yang cocok dengan pencarian ini.',
        emptyUncategorized: 'Belum ada item tanpa kategori.',
        emptyFolder: 'Belum ada item tersimpan di folder ini.',
        readOnlyBody: 'Item tersimpan tetap terlihat di sini. Masuk untuk mengedit.',
        emptyDefault: 'Belum ada item tersimpan. Simpan dari Beranda, Chat, atau Scan.',
        quickNote: 'Catatan Cepat',
        recipeItem: 'Item resep',
        loadError: 'Collection belum bisa dimuat sekarang.',
        updateError: 'Collection belum bisa diperbarui sekarang.',
      };
    }
    if (language === 'ar') {
      return {
        filterTitle: 'تصفية',
        filterSubtitle: 'ابحث وضيّق القائمة.',
        foldersTitle: 'المجلدات',
        browseOnly: 'تصفح فقط.',
        tidyFolders: 'استخدم المجلدات للحفاظ على ترتيب العناصر.',
        uncategorized: 'غير مصنف',
        folderFallback: 'مجلد',
        recipe: 'وصفة',
        note: 'ملاحظة',
        canvas: 'لوحة',
        updated: 'تم التحديث',
        emptyTitle: 'لا يوجد شيء هنا بعد',
        share: 'مشاركة',
        moveToFolder: 'نقل إلى مجلد',
        noteSubtitle: 'اجعلها قصيرة ومفيدة.',
        noteBodyPlaceholder: 'اكتب ملاحظة markdown...',
        folderLabel: 'مجلد',
        organizeLibrary: 'حافظ على تنظيم المكتبة.',
        newFolder: 'مجلد جديد',
        add: 'إضافة',
        items: 'عناصر',
        rename: 'إعادة تسمية',
        delete: 'حذف',
        renameFolder: 'إعادة تسمية المجلد',
        selectFolderHint: 'حدد شريحة مجلد في الصفحة لإعادة التسمية أو الحذف من هنا.',
        tip: 'معلومة',
        selectFolderTip: 'حدد شريحة مجلد في الصفحة لإدارته.',
        createFolderHint: 'لا يزال بإمكانك إنشاء مجلد جديد من هذه اللوحة.',
        emptySearch: 'لا توجد عناصر محفوظة تطابق هذا البحث.',
        emptyUncategorized: 'لا توجد عناصر غير مصنفة بعد.',
        emptyFolder: 'لا توجد عناصر محفوظة في هذا المجلد.',
        readOnlyBody: 'تبقى العناصر المحفوظة مرئية هنا. سجّل الدخول للتعديل.',
        emptyDefault: 'لا توجد عناصر محفوظة بعد. احفظ من الصفحة الرئيسية أو الدردشة أو المسح.',
      };
    }
    return {
      filterTitle: 'Filter',
      filterSubtitle: 'Search and narrow the list.',
      foldersTitle: 'Folders',
      browseOnly: 'Browse only.',
      tidyFolders: 'Use folders to keep items tidy.',
      uncategorized: 'Uncategorized',
      folderFallback: 'Folder',
      recipe: 'Recipe',
      note: 'Note',
      canvas: 'Canvas',
      updated: 'Updated',
      emptyTitle: 'Nothing here yet',
      emptyPreview: 'No preview yet.',
      share: 'Share',
      moveToFolder: 'Move to folder',
      noteSubtitle: 'Keep it short and useful.',
      noteBodyPlaceholder: 'Write markdown note...',
      folderLabel: 'Folder',
      organizeLibrary: 'Keep the library organized.',
      newFolder: 'New folder',
      add: 'Add',
      items: 'items',
      rename: 'Rename',
      delete: 'Delete',
      renameFolder: 'Rename folder',
      selectFolderHint: 'Select a folder chip on the page to rename or delete it here.',
      tip: 'Tip',
      selectFolderTip: 'Select a folder chip on the page to manage it.',
      createFolderHint: 'You can still create a new folder from this sheet.',
      emptySearch: 'No saved items match this search.',
      emptyUncategorized: 'No uncategorized items yet.',
      emptyFolder: 'No saved items in this folder.',
      readOnlyBody: 'Saved items stay visible here. Sign in to edit.',
      emptyDefault: 'No saved items yet. Save from Home, Chat, or Scan.',
      quickNote: 'Quick Note',
      recipeItem: 'Recipe item',
      loadError: 'Unable to load Collection right now.',
      updateError: 'Unable to update Collection right now.',
    };
  }, [language]);

  const guestReadOnly = guestModeEnabled && !session;

  const reload = async () => {
    try {
      const [nextItems, nextFolders] = await Promise.all([
        listCollectionItems(),
        listCollectionFolders(),
      ]);

      setItems(nextItems);
      setFolders(nextFolders);
      setListError('');
    } catch (error) {
      setListError(copy.loadError || 'Unable to load Collection right now.');
      trackEvent('screen_error', {
        screen: 'collection',
        reason: 'reload_failed',
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    trackEvent('screen_ready', { screen: 'collection', guestReadOnly });
    void reload();
  }, [copy.loadError, guestReadOnly, isFocused]);

  useEffect(() => {
    if (guestReadOnly) {
      trackEvent('auth_gate_seen', { surface: 'collection', guestModeEnabled });
    }
  }, [guestModeEnabled, guestReadOnly]);

  const runCollectionMutation = async (action: string, mutation: () => Promise<void>, onSuccess?: () => void) => {
    try {
      setListError('');
      await mutation();
      trackEvent('action_succeeded', { action });
      if (onSuccess) onSuccess();
      await reload();
    } catch (error) {
      setListError(copy.updateError || 'Unable to update Collection right now.');
      trackEvent('action_failed', {
        action,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);

    return items.filter((item) => {
      if (selectedFolderId === 'uncategorized' && item.folderId) return false;
      if (selectedFolderId && selectedFolderId !== 'uncategorized' && item.folderId !== selectedFolderId) return false;

      if (filter === 'recipe' && item.type !== 'recipe') return false;
      if (filter === 'ai_canvas' && item.type !== 'ai_canvas') return false;
      if (filter === 'note' && !isNote(item)) return false;

      if (!normalizedQuery) return true;
      const inTitle = normalizeSearchValue(item.title || '').includes(normalizedQuery);
      if (inTitle) return true;

      if (item.type === 'recipe') {
        const haystack = normalizeSearchValue(`${item.content?.name || ''} ${item.content?.description || ''}`);
        return haystack.includes(normalizedQuery);
      }

      return normalizeSearchValue(item.content?.markdown || '').includes(normalizedQuery);
    });
  }, [filter, items, query, selectedFolderId]);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const key = item.folderId || 'uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [items]);

  const activeFolder = selectedFolderId && selectedFolderId !== 'uncategorized'
    ? folders.find((folder) => folder.id === selectedFolderId) || null
    : null;

  const openCreateNote = () => {
    if (guestReadOnly) return;
    setEditingNoteId('');
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteFolderId(selectedFolderId && selectedFolderId !== 'uncategorized' ? selectedFolderId : '');
    setEditorOpen(true);
  };

  const openEditNote = (item: CollectionItemRecord) => {
    if (guestReadOnly || !isNote(item)) return;
    setEditingNoteId(item.id);
    setNoteTitle(item.title || '');
    setNoteMarkdown(item.content.markdown || '');
    setNoteFolderId(item.folderId || '');
    setDetailItem(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNoteId('');
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteFolderId('');
  };

  const saveNote = async () => {
    if (guestReadOnly) return;
    const markdown = noteMarkdown.trim();
    if (!markdown) return;

    const title = noteTitle.trim() || copy.quickNote || 'Quick Note';
    const id = editingNoteId || genId('col');

    await runCollectionMutation(editingNoteId ? 'collection_update_note' : 'collection_save_note', async () => {
      await saveCollectionItem({
        id,
        type: 'ai_canvas',
        title,
        folderId: noteFolderId || undefined,
        content: {
          markdown,
          kind: 'note',
        },
        createdAt: editingNoteId ? (items.find((item) => item.id === editingNoteId)?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      });
    }, closeEditor);
  };

  const shareItem = async (item: CollectionItemRecord) => {
    const message = item.type === 'recipe'
      ? `${item.title}\n\n${item.content.description || copy.recipeItem || 'Recipe item'}`
      : `${item.title}\n\n${item.content.markdown || ''}`;

    await Share.share({
      title: item.title || webT.collection,
      message,
    });
    trackEvent('action_succeeded', { action: 'collection_share_item', itemType: item.type });
  };

  const emptyMessage = useMemo(() => {
    if (listError) return listError;
    if (query.trim()) return copy.emptySearch;
    if (selectedFolderId === 'uncategorized') return copy.emptyUncategorized;
    if (selectedFolderId) return copy.emptyFolder;
    if (guestReadOnly) return copy.readOnlyBody;
    return copy.emptyDefault;
  }, [copy, guestReadOnly, listError, query, selectedFolderId]);

  const dockHidden = editorOpen || folderManagerOpen || Boolean(detailItem);

  return (
    <>
      <AppShell
        header={(
          <HeroHeader
            eyebrow={webT.collection}
            title={webT.collection}
            subtitle={webT.homeCollectionSubtitle}
            direction={direction}
            status={(
              <InfoPill label={guestReadOnly ? copy.browseOnly : `${filteredItems.length} ${copy.items}`} tone={guestReadOnly ? 'warning' : 'accent'} />
            )}
          />
        )}
        bottomDock={!guestReadOnly && !dockHidden ? (
          <BottomActionDock
            primaryAction={{ label: webT.newNote, onPress: openCreateNote }}
            secondaryActions={[
              { label: webT.createFolder, onPress: () => setFolderManagerOpen(true) },
            ]}
          />
        ) : undefined}
      >
        <SectionCard title={copy.filterTitle} subtitle={copy.filterSubtitle} compact>
          <View style={styles.searchField}>
            <Ionicons name="search" size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={webT.searchNotes}
              placeholderTextColor={uiTokens.text.muted}
              style={styles.searchInput}
            />
          </View>
          <SegmentedControl items={filterItems} value={filter} onChange={setFilter} direction={direction} />
        </SectionCard>

        <SectionCard
          title={copy.foldersTitle}
          subtitle={guestReadOnly ? copy.browseOnly : copy.tidyFolders}
          compact
          footer={!guestReadOnly ? <ActionButton label={webT.createFolder} tone="ghost" compact direction={direction} onPress={() => setFolderManagerOpen(true)} /> : undefined}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.folderRow, isRtl ? styles.rowRtl : null]}>
            <Pressable
              style={[styles.folderChip, selectedFolderId === null ? styles.folderChipActive : null]}
              onPress={() => setSelectedFolderId(null)}
            >
              <Text style={[styles.folderChipText, selectedFolderId === null ? styles.folderChipTextActive : null]}>
                {webT.allItems}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.folderChip, selectedFolderId === 'uncategorized' ? styles.folderChipActive : null]}
              onPress={() => setSelectedFolderId('uncategorized')}
            >
              <Text style={[styles.folderChipText, selectedFolderId === 'uncategorized' ? styles.folderChipTextActive : null]}>
                {copy.uncategorized}
              </Text>
            </Pressable>
            {folders.map((folder) => (
              <Pressable
                key={folder.id}
                style={[styles.folderChip, selectedFolderId === folder.id ? styles.folderChipActive : null]}
                onPress={() => setSelectedFolderId(folder.id)}
              >
                <Text style={[styles.folderChipText, selectedFolderId === folder.id ? styles.folderChipTextActive : null]}>
                  {folder.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SectionCard>

        <View style={styles.listSection}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Pressable key={item.id} onPress={() => setDetailItem(item)}>
                <SectionCard
                  title={item.title}
                  subtitle={buildCollectionPreview(item, copy.emptyPreview || 'No preview yet.')}
                  compact
                  footer={(
                    <View style={styles.itemFooter}>
                      <InfoPill label={item.type === 'recipe' ? copy.recipe : isNote(item) ? copy.note : copy.canvas} tone="accent" />
                      {item.folderId ? (
                        <InfoPill
                          label={folders.find((folder) => folder.id === item.folderId)?.name || copy.folderFallback}
                          tone="success"
                        />
                      ) : (
                        <InfoPill label={webT.noFolder} />
                      )}
                    </View>
                  )}
                >
                  <Text style={styles.updatedAt}>{copy.updated} {new Date(item.updatedAt).toLocaleDateString(locale)}</Text>
                </SectionCard>
              </Pressable>
            ))
          ) : (
            <SectionCard tone="subtle" title={copy.emptyTitle} subtitle={emptyMessage} compact />
          )}
        </View>
      </AppShell>

      <ResultSheet
        visible={Boolean(detailItem)}
        direction={direction}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title || webT.collection}
        subtitle={detailItem ? new Date(detailItem.updatedAt).toLocaleString(locale) : undefined}
        actions={detailItem ? [
          {
            label: copy.share,
            tone: 'secondary',
            onPress: () => void shareItem(detailItem),
          },
          ...(!guestReadOnly ? [{
            label: webT.delete,
            tone: 'danger' as const,
            onPress: () => void runCollectionMutation('collection_delete_item', async () => {
              await softDeleteCollectionItem(detailItem.id);
            }, () => setDetailItem(null)),
          }] : []),
          ...(detailItem && isNote(detailItem) && !guestReadOnly ? [{
            label: `${webT.edit} ${copy.note}`,
            tone: 'primary' as const,
            onPress: () => openEditNote(detailItem),
          }] : []),
        ] : []}
        content={detailItem ? (
          <View style={styles.sheetContent}>
            <Text style={[styles.detailBody, isRtl ? styles.textRtl : null]}>{buildCollectionPreview(detailItem, copy.emptyPreview || 'No preview yet.')}</Text>
            {!guestReadOnly ? (
              <SectionCard title={copy.moveToFolder} compact>
                <View style={[styles.folderMoveRow, isRtl ? styles.rowRtl : null]}>
                  <ActionButton
                    label={webT.noFolder}
                    compact
                    tone={!detailItem.folderId ? 'primary' : 'secondary'}
                    onPress={() => void runCollectionMutation('collection_move_item', async () => {
                      await moveCollectionItem(detailItem.id, undefined);
                    }, () => setDetailItem((current) => current ? { ...current, folderId: undefined } : current))}
                  />
                  {folders.map((folder) => (
                    <ActionButton
                      key={folder.id}
                      label={folder.name}
                      compact
                      tone={detailItem.folderId === folder.id ? 'primary' : 'secondary'}
                      onPress={() => void runCollectionMutation('collection_move_item', async () => {
                        await moveCollectionItem(detailItem.id, folder.id);
                      }, () => setDetailItem((current) => current ? { ...current, folderId: folder.id } : current))}
                    />
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </View>
        ) : <View />}
      />

      <ResultSheet
        visible={editorOpen}
        direction={direction}
        onClose={closeEditor}
        title={editingNoteId ? webT.editNote : webT.newNote}
        subtitle={copy.noteSubtitle}
        actions={[
          {
            label: editingNoteId ? webT.updateNote : webT.saveNote,
            tone: 'primary',
            onPress: () => void saveNote(),
            disabled: !noteMarkdown.trim(),
          },
        ]}
        content={(
          <View style={styles.sheetContent}>
            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder={webT.noteTitle}
              placeholderTextColor={uiTokens.text.muted}
              style={styles.fieldInput}
            />
            <TextInput
              value={noteMarkdown}
              onChangeText={setNoteMarkdown}
              placeholder={copy.noteBodyPlaceholder}
              placeholderTextColor={uiTokens.text.muted}
              style={styles.fieldTextArea}
              multiline
              textAlignVertical="top"
            />
            <SectionCard title={copy.folderLabel} compact>
              <View style={[styles.folderMoveRow, isRtl ? styles.rowRtl : null]}>
                <ActionButton
                  label={webT.noFolder}
                  compact
                  tone={!noteFolderId ? 'primary' : 'secondary'}
                  onPress={() => setNoteFolderId('')}
                />
                {folders.map((folder) => (
                  <ActionButton
                    key={folder.id}
                    label={folder.name}
                    compact
                    tone={noteFolderId === folder.id ? 'primary' : 'secondary'}
                    onPress={() => setNoteFolderId(folder.id)}
                  />
                ))}
              </View>
            </SectionCard>
          </View>
        )}
      />

      <ResultSheet
        visible={folderManagerOpen}
        direction={direction}
        onClose={() => {
          setFolderManagerOpen(false);
          setNewFolderName('');
          setRenameFolderId('');
          setRenameFolderValue('');
        }}
        title={webT.createFolder}
        subtitle={copy.organizeLibrary}
        content={(
          <View style={styles.sheetContent}>
            <SectionCard title={copy.newFolder} compact footer={(
              <ActionButton
                label={copy.add}
                tone="primary"
                onPress={() => void runCollectionMutation('collection_create_folder', async () => {
                  await createCollectionFolder(newFolderName);
                }, () => setNewFolderName(''))}
                disabled={!newFolderName.trim()}
              />
            )}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder={webT.folderName}
                placeholderTextColor={uiTokens.text.muted}
                style={styles.fieldInput}
              />
            </SectionCard>

            {activeFolder ? (
              <SectionCard
                title={activeFolder.name}
                subtitle={`${folderCounts.get(activeFolder.id) || 0} ${copy.items}`}
                compact
                footer={(
                <View style={[styles.managerActions, isRtl ? styles.rowRtl : null]}>
                    <ActionButton
                      label={copy.rename}
                      tone="secondary"
                      compact
                      onPress={() => {
                        setRenameFolderId(activeFolder.id);
                        setRenameFolderValue(renameFolderValue || activeFolder.name);
                      }}
                    />
                    <ActionButton
                      label={copy.delete}
                      tone="danger"
                      compact
                      onPress={() => void runCollectionMutation('collection_delete_folder', async () => {
                        await softDeleteCollectionFolder(activeFolder.id);
                      }, () => {
                        setSelectedFolderId(null);
                        setRenameFolderId('');
                        setRenameFolderValue('');
                      })}
                    />
                  </View>
                )}
              >
                {renameFolderId === activeFolder.id ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      value={renameFolderValue}
                      onChangeText={setRenameFolderValue}
                      placeholder={copy.renameFolder}
                      placeholderTextColor={uiTokens.text.muted}
                      style={styles.fieldInput}
                    />
                    <ActionButton
                      label={webT.save}
                      tone="primary"
                      compact
                      onPress={() => void runCollectionMutation('collection_rename_folder', async () => {
                        await renameCollectionFolder(activeFolder.id, renameFolderValue);
                      }, () => {
                        setRenameFolderId('');
                        setRenameFolderValue('');
                      })}
                      disabled={!renameFolderValue.trim()}
                    />
                  </View>
                ) : (
                  <Text style={styles.managerHint}>{copy.selectFolderHint}</Text>
                )}
              </SectionCard>
            ) : (
              <SectionCard title={copy.tip} subtitle={copy.selectFolderTip} compact>
                <Text style={styles.managerHint}>{copy.createFolderHint}</Text>
              </SectionCard>
            )}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    paddingVertical: 12,
  },
  folderRow: {
    gap: 8,
    paddingRight: 8,
  },
  folderChip: {
    borderRadius: uiTokens.radius.pill,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.soft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  folderChipActive: {
    backgroundColor: uiTokens.surface.accent,
    borderColor: uiTokens.colors.accent,
  },
  folderChipText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  folderChipTextActive: {
    color: uiTokens.colors.accent,
    fontFamily: uiTokens.fontFamily.semibold,
  },
  listSection: {
    gap: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  updatedAt: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  emptyText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  sheetContent: {
    gap: 12,
  },
  detailBody: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 22,
  },
  textRtl: {
    textAlign: 'right',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  folderMoveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldInput: {
    minHeight: 48,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  fieldTextArea: {
    minHeight: 160,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 22,
  },
  managerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  renameRow: {
    gap: 10,
  },
  managerHint: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
});
