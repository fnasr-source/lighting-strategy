import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ClientArtifactType =
    | 'strategy_doc'
    | 'strategy_presentation'
    | 'ad_copy'
    | 'campaign_flow'
    | 'report'
    | 'task_bundle'
    | 'asset';

export type ClientArtifactStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type ClientArtifactVisibility = 'internal' | 'client';

type TimestampLike = {
    toDate?: () => Date;
    toMillis?: () => number;
    seconds?: number;
} | string | number | Date | null | undefined;

export interface ClientArtifact {
    id?: string;
    clientId: string;
    clientName: string;
    artifactType: ClientArtifactType;
    title: string;
    slug: string;
    status: ClientArtifactStatus;
    visibility: ClientArtifactVisibility;
    sourcePath?: string;
    summary?: string;
    locale?: string;
    version?: string;
    storageUrl?: string;
    opsUrl?: string;
    publishedAt?: TimestampLike;
    publishedBy?: string;
    tags?: string[];
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
}

export interface ClientArtifactVersion {
    id?: string;
    artifactId: string;
    clientId: string;
    clientName: string;
    artifactType: ClientArtifactType;
    visibility: ClientArtifactVisibility;
    version: string;
    summary?: string;
    publishedBy?: string;
    snapshot?: Partial<ClientArtifact>;
    createdAt?: TimestampLike;
}

export interface ClientApproval {
    id?: string;
    artifactId: string;
    clientId: string;
    clientName: string;
    artifactType: ClientArtifactType;
    title: string;
    status: 'pending' | 'approved' | 'changes_requested';
    requestedBy: string;
    requestedByName: string;
    decisionBy?: string;
    decisionSummary?: string;
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
}

export interface ArtifactSubscribeOptions {
    artifactTypes?: ClientArtifactType[];
    clientIds?: string[];
    statuses?: ClientArtifactStatus[];
    visibilities?: ClientArtifactVisibility[];
}

function splitIntoBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        batches.push(items.slice(i, i + size));
    }
    return batches;
}

function getSortableTime(value: TimestampLike): number {
    if (!value) return 0;
    if (typeof value === 'object' && value !== null && typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function uniqueStrings<T extends string>(items?: readonly T[]): T[] {
    return [...new Set((items || []).filter(Boolean))] as T[];
}

function filterArtifacts(items: ClientArtifact[], options: ArtifactSubscribeOptions): ClientArtifact[] {
    const artifactTypes = uniqueStrings(options.artifactTypes);
    const statuses = uniqueStrings(options.statuses);
    const visibilities = uniqueStrings(options.visibilities);

    return items
        .filter((item) => artifactTypes.length === 0 || artifactTypes.includes(item.artifactType))
        .filter((item) => statuses.length === 0 || statuses.includes(item.status))
        .filter((item) => visibilities.length === 0 || visibilities.includes(item.visibility))
        .sort((a, b) => getSortableTime(b.updatedAt || b.createdAt) - getSortableTime(a.updatedAt || a.createdAt));
}

function subscribeWithClientBatches<T extends ClientArtifact | ClientApproval>(
    collectionName: string,
    clientIds: string[],
    callback: (items: T[]) => void,
    filter: (items: T[]) => T[],
) {
    const uniqueIds = uniqueStrings(clientIds);
    if (uniqueIds.length === 0) {
        callback([]);
        return () => { };
    }

    const batches = splitIntoBatches(uniqueIds, 10);
    const latestByBatch: T[][] = batches.map(() => []);

    const emit = () => {
        callback(filter(latestByBatch.flat()));
    };

    const unsubs = batches.map((batch, index) =>
        onSnapshot(
            query(collection(db, collectionName), where('clientId', 'in', batch)),
            (snap) => {
                latestByBatch[index] = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as T));
                emit();
            },
        ),
    );

    return () => unsubs.forEach((unsub) => unsub());
}

export function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

export function getArtifactTypeLabel(type: ClientArtifactType): string {
    switch (type) {
        case 'strategy_doc':
            return 'Strategy';
        case 'strategy_presentation':
            return 'Presentation';
        case 'ad_copy':
            return 'Ad Copy';
        case 'campaign_flow':
            return 'Campaign Flow';
        case 'report':
            return 'Report';
        case 'task_bundle':
            return 'Task Bundle';
        case 'asset':
            return 'Asset';
        default:
            return 'Artifact';
    }
}

export const clientArtifactsService = {
    subscribe(options: ArtifactSubscribeOptions, callback: (items: ClientArtifact[]) => void) {
        if (options.clientIds) {
            return subscribeWithClientBatches<ClientArtifact>(
                'clientArtifacts',
                options.clientIds,
                callback,
                (items) => filterArtifacts(items, options),
            );
        }

        return onSnapshot(collection(db, 'clientArtifacts'), (snap) => {
            const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ClientArtifact));
            callback(filterArtifacts(items, options));
        });
    },

    async create(data: Omit<ClientArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const publishedAt = data.status === 'published'
            ? (data.publishedAt || serverTimestamp())
            : (data.publishedAt || null);

        const ref = await addDoc(collection(db, 'clientArtifacts'), {
            ...data,
            publishedAt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<ClientArtifact>): Promise<void> {
        await updateDoc(doc(db, 'clientArtifacts', id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'clientArtifacts', id));
    },

    async recordVersion(data: Omit<ClientArtifactVersion, 'id' | 'createdAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'clientArtifactVersions'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },
};

export const clientApprovalsService = {
    subscribeByClientIds(clientIds: string[], callback: (items: ClientApproval[]) => void) {
        return subscribeWithClientBatches<ClientApproval>(
            'clientApprovals',
            clientIds,
            callback,
            (items) => items.sort((a, b) => getSortableTime(b.updatedAt || b.createdAt) - getSortableTime(a.updatedAt || a.createdAt)),
        );
    },

    async create(data: Omit<ClientApproval, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const ref = await addDoc(collection(db, 'clientApprovals'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    },

    async update(id: string, data: Partial<ClientApproval>): Promise<void> {
        await updateDoc(doc(db, 'clientApprovals', id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },
};
