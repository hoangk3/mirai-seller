const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Dọn dẹp (xóa và tạo mới) một kênh')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Kênh cần nuke (mặc định là kênh hiện tại)')
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (channel.type !== ChannelType.GuildText) {
            return interaction.editReply({ content: `${client.emojis_custom.DR_cay} Chỉ có thể nuke kênh văn bản!` });
        }

        const embedConfirm = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_What} XÁC NHẬN NUKE`)
            .setDescription(`Bạn có chắc chắn muốn **làm mới toàn bộ** kênh ${channel}? Hành động này không thể hoàn tác!`)
            .setFooter({ text: 'Nút bấm sẽ hết hạn sau 15 giây' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nuke_confirm').setLabel('Xác nhận').setStyle(ButtonStyle.Danger).setEmoji('🔥'),
            new ButtonBuilder().setCustomId('nuke_cancel').setLabel('Hủy bỏ').setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.editReply({ embeds: [embedConfirm], components: [row] });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Chỉ người dùng lệnh mới có thể xác nhận!', flags: [4096] });

            if (i.customId === 'nuke_confirm') {
                await i.deferUpdate();
                const position = channel.position;
                const parent = channel.parent;

                const newChannel = await channel.clone();
                await channel.delete().catch(() => null);

                await newChannel.setPosition(position);
                if (parent) await newChannel.setParent(parent);

                const embedSuccess = new EmbedBuilder()
                    .setColor(client.config.colors.success)
                    .setTitle(`${client.emojis_custom.DR_Clean} NUKE THÀNH CÔNG`)
                    .setDescription('Kênh này đã được làm mới sạch sẽ!')
                    .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I4YjFkZTM4YjRhYjFkZTM4YjRhYjFkZTM4YjRhYjFkZTM4YjRhJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/HhTXt43pk1I1W/giphy.gif')
                    .setFooter({ text: client.config.footer });

                await newChannel.send({ embeds: [embedSuccess] });
                if (channel.id !== interaction.channelId) {
                    await interaction.editReply({ content: `✅ Đã nuke kênh ${newChannel}!`, embeds: [], components: [] });
                }
            } else {
                await i.update({ content: '❌ Đã hủy lệnh nuke.', embeds: [], components: [] });
            }
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                interaction.editReply({ content: '⌛ Đã hết thời gian xác nhận.', embeds: [], components: [] }).catch(() => null);
            }
        });
    },
    async messageExecute(message, args, client) {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        if (channel.type !== ChannelType.GuildText) {
            return message.reply(`${client.emojis_custom.DR_cay} Chỉ có thể nuke kênh văn bản!`);
        }

        const embedConfirm = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_What} XÁC NHẬN NUKE`)
            .setDescription(`Bạn có chắc chắn muốn **làm mới toàn bộ** kênh ${channel}? (Gõ \`yes\` để xác nhận trong 15s)`);

        const confirmMsg = await message.reply({ embeds: [embedConfirm] });

        const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
        const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async m => {
            const position = channel.position;
            const parent = channel.parent;

            const newChannel = await channel.clone();
            await channel.delete().catch(() => null);

            await newChannel.setPosition(position);
            if (parent) await newChannel.setParent(parent);

            const embedSuccess = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Clean} NUKE THÀNH CÔNG`)
                .setDescription('Kênh này đã được làm mới sạch sẽ!')
                .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I4YjFkZTM4YjRhYjFkZTM4YjRhYjFkZTM4YjRhYjFkZTM4YjRhJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/HhTXt43pk1I1W/giphy.gif')
                .setFooter({ text: client.config.footer });

            await newChannel.send({ embeds: [embedSuccess] });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                confirmMsg.edit({ content: '⌛ Đã hết thời gian xác nhận nuke.', embeds: [] }).catch(() => null);
            }
        });
    },
};
