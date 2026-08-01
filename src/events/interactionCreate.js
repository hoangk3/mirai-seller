const {
    Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
    AttachmentBuilder
} = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const { TicketModel, CounterModel } = require('../models/Ticket');
const { ticketCategories } = require('../utils/ticketCategories');
const { isUserBlacklisted } = require('../utils/blacklistCheck');
const { checkCooldown, COOLDOWNS } = require('../utils/cooldown');
const { closeTicket } = require('../utils/ticketActions');

const config = require('../config/discord-config');
const logger = require('../utils/logger');

const DB = require('../utils/database');

/**
 * Helper to resolve local image files from config paths
 */
function resolveLocalFile(configPath, relativeToRootDepth = 2) {
    if (!configPath) return null;
    if (configPath.startsWith('http://') || configPath.startsWith('https://') || configPath.startsWith('attachment://')) {
        return null;
    }
    const rootPath = path.join(__dirname, '../'.repeat(relativeToRootDepth));
    const pathsToTry = [
        path.join(rootPath, configPath),
        path.join(rootPath, 'src/img', path.basename(configPath)),
        path.join(rootPath, 'img', path.basename(configPath))
    ];
    for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // ==================== SLASH COMMANDS ====================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logger.warn(`Lệnh ${interaction.commandName} không được tìm thấy`);
                return;
            }

            try {
                // Kiểm tra quyền sử dụng lệnh theo Role
                const MEMBER_ROLE = '1380900663726182431';
                const STAFF_ROLE = '1517899422225399848';
                const ALLOWED_MEMBER_COMMANDS = ['serverinfo', 'help', 'me', 'topcash', 'math', 'qrhuy', 'qrloi', 'qrluz', 'pin'];

                const memberRoles = interaction.member?.roles?.cache;
                if (memberRoles) {
                    const isMember = memberRoles.has(MEMBER_ROLE);
                    const isStaff = memberRoles.has(STAFF_ROLE) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
                    const cmdName = interaction.commandName.toLowerCase();
                    const isMemberCommand = ALLOWED_MEMBER_COMMANDS.includes(cmdName);

                    if (isMemberCommand) {
                        if (!isMember && !isStaff) {
                            return interaction.reply({
                                content: `${config.EMOJIS.CROSS || "❌"} Bạn không có quyền sử dụng lệnh này!`,
                                flags: [MessageFlags.Ephemeral]
                            });
                        }
                    } else {
                        if (!isStaff) {
                            return interaction.reply({
                                content: `${config.EMOJIS.CROSS || "❌"} Bạn không có quyền sử dụng lệnh này!`,
                                flags: [MessageFlags.Ephemeral]
                            });
                        }
                    }
                }

                // Gửi log sử dụng lệnh Admin
                const cmdName = interaction.commandName.toLowerCase();
                const isMemberCommand = ALLOWED_MEMBER_COMMANDS.includes(cmdName);
                if (!isMemberCommand) {
                    const logChannelId = '1519187835192606912';
                    const logChannel = client.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(() => null);
                    if (logChannel) {
                        const optionsStr = interaction.options.data.map(opt => `${opt.name}: ${opt.value}`).join(', ') || 'Không có';
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🛡️ Lệnh Admin được sử dụng')
                            .setColor('#e74c3c')
                            .addFields(
                                { name: 'Người dùng', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                { name: 'Kênh', value: `${interaction.channel?.name || 'DM'} (${interaction.channelId})`, inline: true },
                                { name: 'Lệnh', value: `\`/${interaction.commandName}\``, inline: true },
                                { name: 'Tham số', value: `\`\`\`${optionsStr}\`\`\`` }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }

                await command.execute(interaction, client);
            } catch (error) {
                if (error.code === 10062) {
                    return logger.warn(`[INTERACTION] Interaction ${interaction.id} đã hết hạn trước khi xử lý xong.`);
                }

                logger.error(`Lỗi thực thi lệnh ${interaction.commandName}:`, error);

                const errorPayload = {
                    content: `${config.EMOJIS.CROSS || '❌'} Có lỗi xảy ra khi thực thi lệnh!`,
                    flags: [MessageFlags.Ephemeral]
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload).catch(() => { });
                } else {
                    await interaction.reply(errorPayload).catch(() => { });
                }
            }
        }

        // ==================== BUTTON INTERACTIONS ====================
        else if (interaction.isButton()) {
            try {
                const { customId, user } = interaction;

                // 3. Ticket Open (DOTTIE_MANAGER)
                if (customId.startsWith('ticket_open:')) {
                    const category = customId.split(':')[1];
                    const catConfig = ticketCategories[category];
                    if (!catConfig) return interaction.reply({ content: 'Danh mục không hợp lệ.', flags: [MessageFlags.Ephemeral] });

                    const blacklist = await isUserBlacklisted(user.id, interaction.guild.id);
                    if (blacklist.blacklisted) {
                        return interaction.reply({ content: 'Bạn đã bị cấm tạo ticket.', flags: [MessageFlags.Ephemeral] });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal:${category}`)
                        .setTitle(`Hỗ trợ: ${catConfig.label}`);

                    const components = catConfig.fields.map(field => {
                        const input = new TextInputBuilder()
                            .setCustomId(field.id)
                            .setLabel(field.label)
                            .setPlaceholder(field.placeholder)
                            .setStyle(field.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
                            .setRequired(field.required);
                        return new ActionRowBuilder().addComponents(input);
                    });

                    modal.addComponents(components);
                    await interaction.showModal(modal);
                }

                // 4. Ticket Close Confirmation (DOTTIE_MANAGER)
                else if (customId === 'ticket_close_confirm') {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_close_execute').setLabel('Đóng').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('ticket_close_reason_execute').setLabel('Đóng với lý do').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                    );
                    await interaction.reply({ content: 'Bạn có chắc chắn muốn đóng phiếu hỗ trợ này không?', components: [row], flags: [MessageFlags.Ephemeral] });
                }

                // 5. Ticket Close Execute (DOTTIE_MANAGER)
                else if (customId === 'ticket_close_execute') {
                    try {
                        await interaction.deferUpdate();
                        if (!DB.isConnected()) return interaction.followUp({ content: '❌ Cơ sở dữ liệu hiện không sẵn sàng.', flags: [MessageFlags.Ephemeral] });
                        const ticket = await TicketModel.findOne({ channelId: interaction.channelId });
                        if (!ticket) return interaction.followUp({ content: 'Không tìm thấy dữ liệu ticket.', flags: [MessageFlags.Ephemeral] });

                        await closeTicket(client, ticket, user.tag);
                    } catch (error) {
                        if (error.code !== 10062) console.error(error);
                    }
                }

                // 6. Ticket Close Reason Modal trigger (DOTTIE_MANAGER)
                else if (customId === 'ticket_close_reason_execute') {
                    const modal = new ModalBuilder()
                        .setCustomId('ticket_close_reason_modal')
                        .setTitle('Đóng ticket với lý do');

                    const input = new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('Lý do đóng ticket')
                        .setPlaceholder('Nhập lý do tại đây...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                }

                // 7. Verify Role Button (DOTTIE_MANAGER)
                else if (customId.startsWith('verify_role_')) {
                    const roleId = customId.replace('verify_role_', ''); // '1380900663726182431'
                    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                    if (!member) return interaction.reply({ content: '❌ Không thể xác định thành viên.', flags: [MessageFlags.Ephemeral] });

                    const hasAdd = member.roles.cache.has(roleId);

                    if (hasAdd) {
                        return interaction.reply({
                            content: '✅ Bạn đã được xác minh rồi!',
                            flags: [MessageFlags.Ephemeral]
                        });
                    }

                    const roleToAdd = interaction.guild.roles.cache.get(roleId);
                    if (!roleToAdd) return interaction.reply({ content: '❌ Role xác minh không tồn tại. Vui lòng liên hệ admin.', flags: [MessageFlags.Ephemeral] });

                    try {
                        // Thêm role xác minh
                        await member.roles.add(roleToAdd);

                        return interaction.reply({
                            content: `✅ Xác minh thành công! Bạn đã nhận được role **${roleToAdd.name}**. Chào mừng đến với **${interaction.guild.name}**! 🎉`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    } catch (err) {
                        logger.error(err);
                        return interaction.reply({ content: '❌ Không thể cập nhật role. Bot thiếu quyền hoặc role cao hơn bot.', flags: [MessageFlags.Ephemeral] });
                    }
                }

                // 8. Delete Ticket (DOTTIE_MANAGER)
                else if (customId === 'delete_ticket') {
                    const member = await interaction.guild.members.fetch(user.id);
                    const isSupport = client.config.supportRoleIds?.some(id => member.roles.cache.has(id));
                    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

                    if (!isSupport && !isAdmin) return interaction.reply({ content: 'Bạn không có quyền xóa ticket.', flags: [MessageFlags.Ephemeral] });

                    if (!DB.isConnected()) return interaction.reply({ content: '❌ Cơ sở dữ liệu hiện không sẵn sàng. Không thể xóa ticket.', flags: [MessageFlags.Ephemeral] });

                    await interaction.reply({ content: 'Ticket sẽ được xóa sau 5 giây...' });
                    setTimeout(async () => {
                        await TicketModel.findOneAndDelete({ channelId: interaction.channelId });
                        await interaction.channel.delete().catch(() => null);
                    }, 5000);
                }
            } catch (error) {
                if (error.code !== 10062) {
                    logger.error(`Lỗi thực thi Button ${interaction.customId || 'unknown'}:`, error);
                    const errorPayload = {
                        content: `❌ Có lỗi xảy ra khi xử lý nút bấm này!`,
                        flags: [MessageFlags.Ephemeral]
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorPayload).catch(() => {});
                    } else {
                        await interaction.reply(errorPayload).catch(() => {});
                    }
                }
            }
        }

        // ==================== SELECT MENUS ====================
        else if (interaction.isStringSelectMenu()) {
            const { customId, values } = interaction;

            // 1. PayOS Select Menu panels (DOTTIE_SERVICE)
            if (customId === 'DISCORD_SELECT') {
                const command = client.commands.get('price_discord');
                if (command && command.handleSelect) {
                    return await command.handleSelect(interaction);
                }
            } else if (customId === 'ROBLOX_SELECT') {
                const command = client.commands.get('rate');
                if (command && command.handleSelect) {
                    return await command.handleSelect(interaction);
                }
            }

            // 2. Ticket Category Select (DOTTIE_MANAGER)
            else if (customId === 'ticket_category_select') {
                const category = values[0];
                const catConfig = ticketCategories[category];
                if (!catConfig) return interaction.reply({ content: 'Danh mục không hợp lệ.', flags: [MessageFlags.Ephemeral] });

                const blacklist = await isUserBlacklisted(interaction.user.id, interaction.guild.id);
                if (blacklist.blacklisted) {
                    return interaction.reply({ content: 'Bạn đã bị cấm tạo ticket.', flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`ticket_modal:${category}`)
                    .setTitle(`Hỗ trợ: ${catConfig.label}`);

                const components = catConfig.fields.map(field => {
                    const input = new TextInputBuilder()
                        .setCustomId(field.id)
                        .setLabel(field.label)
                        .setPlaceholder(field.placeholder)
                        .setStyle(field.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
                        .setRequired(field.required);
                    return new ActionRowBuilder().addComponents(input);
                });

                modal.addComponents(components);
                await interaction.showModal(modal);
            }
        }

        // ==================== MODAL SUBMITS ====================
        else if (interaction.isModalSubmit()) {
            try {
                const { customId } = interaction;

                // 1. Ticket Creation Modal Submit (DOTTIE_MANAGER)
                if (customId.startsWith('ticket_modal:')) {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    if (!DB.isConnected()) {
                        return interaction.editReply({ content: '❌ Cơ sở dữ liệu hiện không sẵn sàng. Vui lòng thử lại sau.' });
                    }
                    const category = customId.split(':')[1];
                    const catConfig = ticketCategories[category];

                    const openTickets = await TicketModel.countDocuments({
                        userId: interaction.user.id,
                        guildId: interaction.guild.id,
                        closed: false
                    });

                    if (openTickets >= (client.config.maxOpenTickets || 3)) {
                        return interaction.editReply({
                            content: `Bạn đã đạt giới hạn tối đa ${client.config.maxOpenTickets || 3} ticket đang mở. Vui lòng đóng các ticket cũ trước khi tạo mới.`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }

                    const cooldown = checkCooldown('ticket_create', interaction.user.id, COOLDOWNS.TICKET_CREATE);
                    if (cooldown.onCooldown) {
                        return interaction.editReply({ content: `Vui lòng chờ ${cooldown.remainingTime}s để tạo ticket tiếp theo.` });
                    }

                    const fieldValues = {};
                    catConfig.fields.forEach(f => {
                        fieldValues[f.id] = interaction.fields.getTextInputValue(f.id) || 'N/A';
                    });

                    const counter = await CounterModel.findByIdAndUpdate({ _id: 'ticket' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
                    const ticketId = counter.seq;
                    const channelName = `${catConfig.namePrefix || 'ticket'}-${String(ticketId).padStart(3, '0')}`;

                    const permissionOverwrites = [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ];
                    client.config.supportRoleIds?.filter(id => /^\d+$/.test(id)).forEach(id => {
                        permissionOverwrites.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                    });

                    const channel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: (client.config.ticketCategoryId && /^\d+$/.test(client.config.ticketCategoryId)) ? client.config.ticketCategoryId : null,
                        permissionOverwrites
                    });

                    const ticket = new TicketModel({
                        guildId: interaction.guild.id,
                        userId: interaction.user.id,
                        channelId: channel.id,
                        ticketId,
                        category,
                        ...fieldValues,
                        customFields: fieldValues
                    });
                    await ticket.save();

                    const files = [];
                    const embed = new EmbedBuilder()
                        .setTitle(`Phiếu hỗ trợ #${String(ticketId).padStart(3, '0')}`)
                        .setDescription('Chào mừng bạn đến với kênh hỗ trợ. Vui lòng cung cấp chi tiết yêu cầu của bạn để được hỗ trợ tốt nhất.')
                        .setColor(client.config.colors?.default || '#ffb6c1');

                    // Author Icon setup
                    const authorIcon = client.config?.ui?.authorIcon;
                    if (authorIcon) {
                        if (authorIcon.startsWith('http://') || authorIcon.startsWith('https://') || authorIcon.startsWith('attachment://')) {
                            embed.setAuthor({ name: `${catConfig.label} | ${interaction.user.tag}`, iconURL: authorIcon });
                        } else {
                            const filePath = resolveLocalFile(authorIcon, 2);
                            if (filePath) {
                                const fileName = path.basename(filePath);
                                files.push(new AttachmentBuilder(filePath, { name: fileName }));
                                embed.setAuthor({ name: `${catConfig.label} | ${interaction.user.tag}`, iconURL: `attachment://${fileName}` });
                            } else {
                                embed.setAuthor({ name: `${catConfig.label} | ${interaction.user.tag}` });
                            }
                        }
                    } else {
                        embed.setAuthor({ name: `${catConfig.label} | ${interaction.user.tag}` });
                    }

                    // Thumbnail setup
                    const thumbnail = client.config?.ui?.thumbnail;
                    if (thumbnail) {
                        if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('attachment://')) {
                            embed.setThumbnail(thumbnail);
                        } else {
                            const filePath = resolveLocalFile(thumbnail, 2);
                            if (filePath) {
                                const fileName = path.basename(filePath);
                                files.push(new AttachmentBuilder(filePath, { name: fileName }));
                                embed.setThumbnail(`attachment://${fileName}`);
                            }
                        }
                    }

                    embed.addFields(
                        { name: 'Người tạo', value: interaction.user.toString(), inline: true },
                        { name: 'Danh mục', value: catConfig.label, inline: true }
                    );

                    catConfig.fields.forEach(f => {
                        embed.addFields({ name: f.label, value: `\`\`\`${fieldValues[f.id] || 'N/A'}\`\`\`` });
                    });

                    embed.setFooter({ text: 'Powered by DOTTIE INC', iconURL: interaction.guild.iconURL() });

                    const closeBtn = new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Đóng phiếu').setStyle(ButtonStyle.Danger).setEmoji('🔒');
                    const row = new ActionRowBuilder().addComponents(closeBtn);
                    const mentionRoleIds = [...new Set([...(client.config.roleMentionIds || []), ...(client.config.supportRoleIds || [])].filter(id => /^\d+$/.test(id)))];
                    const mentionContent = mentionRoleIds.length ? mentionRoleIds.map(id => `<@&${id}>`).join(' ') : '';
                    const ticketMessageContent = [interaction.user.toString(), mentionContent].filter(Boolean).join(' ');

                    await channel.send({ content: ticketMessageContent, embeds: [embed], components: [row], files });

                    const goToBtn = new ButtonBuilder().setLabel('Đi đến Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`);
                    await interaction.editReply({ content: `✅ Đã tạo phiếu hỗ trợ **#${ticketId}**!`, components: [new ActionRowBuilder().addComponents(goToBtn)] });
                }

                // 2. Ticket Close Reason Modal Submit (DOTTIE_MANAGER)
                else if (customId === 'ticket_close_reason_modal') {
                    await interaction.deferUpdate();
                    if (!DB.isConnected()) return interaction.followUp({ content: '❌ Cơ sở dữ liệu hiện không sẵn sàng.', flags: [MessageFlags.Ephemeral] });
                    const reason = interaction.fields.getTextInputValue('reason');
                    const ticket = await TicketModel.findOne({ channelId: interaction.channelId });
                    if (!ticket) return;

                    await closeTicket(client, ticket, `${interaction.user.tag} (Lý do: ${reason})`);
                }
            } catch (error) {
                if (error.code !== 10062) {
                    logger.error(`Lỗi thực thi Modal Submit ${interaction.customId || 'unknown'}:`, error);
                    if (error.errors) {
                        logger.error("Chi tiết các lỗi:", error.errors);
                    }
                    const errorPayload = {
                        content: `❌ Có lỗi xảy ra khi xử lý biểu mẫu này!`,
                        flags: [MessageFlags.Ephemeral]
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply(errorPayload).catch(() => {});
                    } else {
                        await interaction.reply(errorPayload).catch(() => {});
                    }
                }
            }
        }
    }
};
